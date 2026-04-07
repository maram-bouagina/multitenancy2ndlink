package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

// ── headers ──────────────────────────────────────────────────────────────────

var productHeaders = []string{
	"id", "title", "slug", "description", "status", "visibility",
	"price", "sale_price", "currency", "sku",
	"track_stock", "stock", "low_stock_threshold",
	"weight", "dimensions", "brand", "tax_class",
	"category_id", "category_slug", "category_name", "published_at", "image_url", "image_urls",
	"meta_title", "meta_description", "canonical_url", "noindex",
}

const directRemoteImageImportSize int64 = 1024

// ── ExportProductsCSV ─────────────────────────────────────────────────────────

func ExportProductsCSV(db *gorm.DB, storeID uuid.UUID, r repo.ProductRepository) ([]byte, error) {
	products, err := r.FindAllForExport(db, storeID)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(productHeaders)

	for _, p := range products {
		_ = w.Write(productToRow(p))
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

// ── ExportProductsXLSX ────────────────────────────────────────────────────────

func ExportProductsXLSX(db *gorm.DB, storeID uuid.UUID, r repo.ProductRepository) ([]byte, error) {
	products, err := r.FindAllForExport(db, storeID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Products"
	f.SetSheetName("Sheet1", sheet)

	// header row (bold)
	for col, h := range productHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	lastHeaderCell, _ := excelize.CoordinatesToCellName(len(productHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", lastHeaderCell, boldStyle)

	for rowIdx, p := range products {
		row := productToRow(p)
		for col, val := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			_ = f.SetCellValue(sheet, cell, val)
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ── ImportProducts ────────────────────────────────────────────────────────────

// ImportResult holds per-row import results.
type ImportResult struct {
	Imported int      `json:"imported"`
	Updated  int      `json:"updated"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// ImportProductsFromFile parses a CSV or XLSX file and upserts products.
// Rows are matched by SKU (if present) or slug.  Missing slug is generated
// from title.  Unknown / invalid values are skipped with an error note.
func ImportProductsFromFile(
	db *gorm.DB,
	storeID uuid.UUID,
	fh *multipart.FileHeader,
	r repo.ProductRepository,
	imageUploadSvc ProductImageUploadService,
	maxImageSizeMB int64,
) (*ImportResult, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	ext := strings.ToLower(fh.Filename)
	var rows [][]string
	var embeddedImages map[int][][]byte

	switch {
	case strings.HasSuffix(ext, ".csv"):
		rows, err = ParseCSV(f)
	case strings.HasSuffix(ext, ".xlsx"):
		// Read all bytes so we can parse twice (rows + pictures).
		data, readErr := io.ReadAll(f)
		if readErr != nil {
			return nil, readErr
		}
		rows, err = ParseXLSX(bytes.NewReader(data))
		if err == nil {
			embeddedImages = extractXLSXEmbeddedImages(data, rows)
		}
	default:
		return nil, errors.New("unsupported file format: use .csv or .xlsx")
	}
	if err != nil {
		return nil, err
	}

	return applyProductRows(db, storeID, rows, r, imageUploadSvc, maxImageSizeMB, embeddedImages)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func productToRow(p models.Product) []string {
	row := make([]string, len(productHeaders))
	row[0] = p.ID.String()
	row[1] = p.Title
	row[2] = p.Slug
	row[3] = strOrEmpty(p.Description)
	row[4] = string(p.Status)
	row[5] = string(p.Visibility)
	row[6] = strconv.FormatFloat(p.Price, 'f', 2, 64)
	row[7] = floatPtrStr(p.SalePrice)
	row[8] = p.Currency
	row[9] = strOrEmpty(p.SKU)
	row[10] = strconv.FormatBool(p.TrackStock)
	row[11] = strconv.Itoa(p.Stock)
	row[12] = intPtrStr(p.LowStockThreshold)
	row[13] = floatPtrStr(p.Weight)
	row[14] = strOrEmpty(p.Dimensions)
	row[15] = strOrEmpty(p.Brand)
	row[16] = strOrEmpty(p.TaxClass)
	if p.CategoryID != nil {
		row[17] = p.CategoryID.String()
	}
	if p.Category != nil {
		row[18] = p.Category.Slug
		row[19] = p.Category.Name
	}
	if p.PublishedAt != nil {
		row[20] = p.PublishedAt.Format("2006-01-02T15:04:05Z")
	}
	if len(p.Images) > 0 {
		imgs := make([]models.ProductImage, len(p.Images))
		copy(imgs, p.Images)
		sort.Slice(imgs, func(i, j int) bool { return imgs[i].Position < imgs[j].Position })
		row[21] = imgs[0].URL
		if len(imgs) > 1 {
			others := make([]string, 0, len(imgs)-1)
			for _, img := range imgs[1:] {
				others = append(others, img.URL)
			}
			row[22] = strings.Join(others, "|")
		}
	}
	row[23] = strOrEmpty(p.MetaTitle)
	row[24] = strOrEmpty(p.MetaDescription)
	row[25] = strOrEmpty(p.CanonicalURL)
	row[26] = strconv.FormatBool(p.Noindex)
	return row
}

func applyProductRows(
	db *gorm.DB,
	storeID uuid.UUID,
	rows [][]string,
	r repo.ProductRepository,
	imageUploadSvc ProductImageUploadService,
	maxImageSizeMB int64,
	embeddedImages map[int][][]byte,
) (*ImportResult, error) {
	if len(rows) < 2 {
		return &ImportResult{}, nil
	}

	// build header index
	idx := map[string]int{}
	for i, h := range rows[0] {
		idx[strings.TrimSpace(strings.ToLower(h))] = i
	}
	get := func(row []string, key string) string {
		i, ok := idx[key]
		if !ok || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}

	res := &ImportResult{}

	for lineNo, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}
		lineNum := lineNo + 2 // 1-based, header = 1

		title := get(row, "title")
		if title == "" {
			title = get(row, "name")
		}
		if title == "" {
			res.Errors = append(res.Errors, fmt.Sprintf("line %d: title is required (accepted headers: title or name)", lineNum))
			res.Skipped++
			continue
		}

		sku := get(row, "sku")
		slug := get(row, "slug")
		if slug == "" {
			slug = generateSlug(title)
		}

		// Determine status / visibility with safe defaults
		status := models.ProductStatus(get(row, "status"))
		if status == "" {
			status = models.StatusDraft
		}
		vis := models.ProductVisibility(get(row, "visibility"))
		if vis == "" {
			vis = models.VisibilityPublic
		}

		price, _ := parseImportFloat(get(row, "price"))
		currency := get(row, "currency")
		if currency == "" {
			currency = "EUR"
		}

		stock, _ := strconv.Atoi(get(row, "stock"))
		trackStock, _ := strconv.ParseBool(get(row, "track_stock"))

		var salePrice *float64
		if v := get(row, "sale_price"); v != "" {
			if f, err := parseImportFloat(v); err == nil {
				salePrice = &f
			}
		}

		var lowStockThreshold *int
		if v := get(row, "low_stock_threshold"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				lowStockThreshold = &n
			}
		}

		var weight *float64
		if v := get(row, "weight"); v != "" {
			if f, err := parseImportFloat(v); err == nil {
				weight = &f
			}
		}

		desc := get(row, "description")
		dims := get(row, "dimensions")
		brand := get(row, "brand")
		taxClass := get(row, "tax_class")
		metaTitle := get(row, "meta_title")
		metaDesc := get(row, "meta_description")
		canonicalURL := get(row, "canonical_url")
		noindexStr := get(row, "noindex")

		var catID *uuid.UUID
		if v := get(row, "category_id"); v != "" {
			if uid, err := uuid.Parse(v); err == nil {
				// Verify the category actually exists before using the UUID
				var exists int64
				db.Model(&models.Category{}).Where("id = ? AND store_id = ?", uid, storeID).Count(&exists)
				if exists > 0 {
					catID = &uid
				}
			}
		}

		if catID == nil {
			if categorySlug := get(row, "category_slug"); categorySlug != "" {
				resolvedID, found, err := resolveCategoryIDBySlug(db, storeID, categorySlug)
				if err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: category lookup failed: %s", lineNum, err))
					res.Skipped++
					continue
				}
				if found {
					catID = &resolvedID
				} else {
					res.Warnings = append(res.Warnings, fmt.Sprintf("line %d: category_slug '%s' not found, product imported without category", lineNum, categorySlug))
				}
			}
		}

		if catID == nil {
			if categoryName := get(row, "category_name"); categoryName != "" {
				resolvedID, found, err := resolveCategoryIDByName(db, storeID, categoryName)
				if err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: category lookup failed: %s", lineNum, err))
					res.Skipped++
					continue
				}
				if found {
					catID = &resolvedID
				} else {
					res.Warnings = append(res.Warnings, fmt.Sprintf("line %d: category_name '%s' not found, product imported without category", lineNum, categoryName))
				}
			}
		}

		// Try to find existing product by SKU then by slug
		var existing *models.Product
		if sku != "" {
			skuExists, err := r.SKUExists(db, sku, storeID, nil)
			if err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't read this product row. Please review the file and try again.", lineNum))
				res.Skipped++
				continue
			}
			if skuExists {
				// find the actual product — query directly since there's no FindBySKU
				var p models.Product
				if err := db.Where("sku = ? AND store_id = ? AND deleted_at IS NULL", sku, storeID).First(&p).Error; err == nil {
					existing = &p
				}
			}
		}
		if existing == nil {
			slugExists, _ := r.SlugExists(db, slug, storeID, nil)
			if slugExists {
				var p models.Product
				if err := db.Where("slug = ? AND store_id = ? AND deleted_at IS NULL", slug, storeID).First(&p).Error; err == nil {
					existing = &p
				}
			}
		}

		var skuPtr *string
		if sku != "" {
			skuPtr = &sku
		}
		var descPtr, dimsPtr, brandPtr, taxClassPtr *string
		if desc != "" {
			descPtr = &desc
		}
		if dims != "" {
			dimsPtr = &dims
		}
		if brand != "" {
			brandPtr = &brand
		}
		if taxClass != "" {
			taxClassPtr = &taxClass
		}
		var metaTitlePtr, metaDescPtr, canonicalURLPtr *string
		if metaTitle != "" {
			metaTitlePtr = &metaTitle
		}
		if metaDesc != "" {
			metaDescPtr = &metaDesc
		}
		if canonicalURL != "" {
			canonicalURLPtr = &canonicalURL
		}
		noindex := strings.EqualFold(noindexStr, "true")

		var targetProduct *models.Product

		if existing != nil {
			// update
			existing.Title = title
			existing.Slug = slug
			existing.Description = descPtr
			existing.Status = status
			existing.Visibility = vis
			existing.Price = price
			existing.SalePrice = salePrice
			existing.Currency = currency
			existing.SKU = skuPtr
			existing.TrackStock = trackStock
			existing.Stock = stock
			existing.LowStockThreshold = lowStockThreshold
			existing.Weight = weight
			existing.Dimensions = dimsPtr
			existing.Brand = brandPtr
			existing.TaxClass = taxClassPtr
			existing.CategoryID = catID
			existing.MetaTitle = metaTitlePtr
			existing.MetaDescription = metaDescPtr
			existing.CanonicalURL = canonicalURLPtr
			existing.Noindex = noindex

			if err := r.Update(db, existing); err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't update this product. Please try again.", lineNum))
				res.Skipped++
				continue
			}
			targetProduct = existing
			res.Updated++
		} else {
			p := &models.Product{
				StoreID:           storeID,
				Title:             title,
				Slug:              slug,
				Description:       descPtr,
				Status:            status,
				Visibility:        vis,
				Price:             price,
				SalePrice:         salePrice,
				Currency:          currency,
				SKU:               skuPtr,
				TrackStock:        trackStock,
				Stock:             stock,
				LowStockThreshold: lowStockThreshold,
				Weight:            weight,
				Dimensions:        dimsPtr,
				Brand:             brandPtr,
				TaxClass:          taxClassPtr,
				CategoryID:        catID,
				MetaTitle:         metaTitlePtr,
				MetaDescription:   metaDescPtr,
				CanonicalURL:      canonicalURLPtr,
				Noindex:           noindex,
			}
			if err := r.Create(db, p); err != nil {
				// If slug/SKU conflict, try to find the existing product and update instead
				if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
					var conflicting models.Product
					if findErr := db.Where("slug = ? AND store_id = ? AND deleted_at IS NULL", slug, storeID).First(&conflicting).Error; findErr == nil {
						conflicting.Title = title
						conflicting.Description = descPtr
						conflicting.Status = status
						conflicting.Visibility = vis
						conflicting.Price = price
						conflicting.SalePrice = salePrice
						conflicting.Currency = currency
						conflicting.SKU = skuPtr
						conflicting.TrackStock = trackStock
						conflicting.Stock = stock
						conflicting.LowStockThreshold = lowStockThreshold
						conflicting.Weight = weight
						conflicting.Dimensions = dimsPtr
						conflicting.Brand = brandPtr
						conflicting.TaxClass = taxClassPtr
						conflicting.CategoryID = catID
						conflicting.MetaTitle = metaTitlePtr
						conflicting.MetaDescription = metaDescPtr
						conflicting.CanonicalURL = canonicalURLPtr
						conflicting.Noindex = noindex
						if updErr := r.Update(db, &conflicting); updErr != nil {
							res.Errors = append(res.Errors, fmt.Sprintf("line %d: update-after-conflict failed: %s", lineNum, updErr))
							res.Skipped++
							continue
						}
						targetProduct = &conflicting
						res.Updated++
					} else {
						res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't save this product. Please check for duplicate values and try again.", lineNum))
						res.Skipped++
						continue
					}
				} else {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't save this product. Please check for duplicate values and try again.", lineNum))
					res.Skipped++
					continue
				}
			} else {
				targetProduct = p
				res.Imported++
			}
		}

		if imageUploadSvc != nil && targetProduct != nil {
			imageURLs := collectImageURLs(get(row, "image_url"), get(row, "image_urls"))
			if len(imageURLs) > 0 {
				res.Warnings = append(res.Warnings, prefixLineWarnings(lineNum,
					importProductImages(context.Background(), db, storeID, targetProduct, imageURLs, title, imageUploadSvc, maxImageSizeMB),
				)...)
			} else if embedded, ok := embeddedImages[lineNo]; ok && len(embedded) > 0 {
				res.Warnings = append(res.Warnings, prefixLineWarnings(lineNum,
					importEmbeddedImages(context.Background(), db, storeID, targetProduct, embedded, title, imageUploadSvc, maxImageSizeMB),
				)...)
			}
		}
	}

	return res, nil
}

func ParseCSV(r io.Reader) ([][]string, error) {
	return csv.NewReader(r).ReadAll()
}

func ParseXLSX(r io.Reader) ([][]string, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("xlsx file has no sheets")
	}
	return f.GetRows(sheets[0])
}

// ── small helpers ─────────────────────────────────────────────────────────────

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func floatPtrStr(f *float64) string {
	if f == nil {
		return ""
	}
	return strconv.FormatFloat(*f, 'f', 2, 64)
}

func intPtrStr(i *int) string {
	if i == nil {
		return ""
	}
	return strconv.Itoa(*i)
}

func generateSlug(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteRune('-')
		}
	}
	return strings.Trim(b.String(), "-")
}

func parseImportFloat(raw string) (float64, error) {
	normalized := strings.TrimSpace(raw)
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = strings.ReplaceAll(normalized, ",", ".")
	return strconv.ParseFloat(normalized, 64)
}

func resolveCategoryIDBySlug(db *gorm.DB, storeID uuid.UUID, slug string) (uuid.UUID, bool, error) {
	var category models.Category
	err := db.Where("store_id = ? AND slug = ?", storeID, strings.TrimSpace(slug)).First(&category).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, false, err
	}
	return category.ID, true, nil
}

func resolveCategoryIDByName(db *gorm.DB, storeID uuid.UUID, name string) (uuid.UUID, bool, error) {
	var category models.Category
	err := db.Where("store_id = ? AND LOWER(name) = LOWER(?)", storeID, strings.TrimSpace(name)).Order("created_at ASC").First(&category).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, false, err
	}
	return category.ID, true, nil
}

func collectImageURLs(primary string, rawList string) []string {
	seen := make(map[string]struct{})
	values := make([]string, 0)
	appendValue := func(raw string) {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return
		}
		if _, ok := seen[trimmed]; ok {
			return
		}
		seen[trimmed] = struct{}{}
		values = append(values, trimmed)
	}

	appendValue(primary)
	for _, candidate := range strings.FieldsFunc(rawList, func(r rune) bool {
		return r == '|' || r == ';' || r == ',' || r == '\n' || r == '\r'
	}) {
		appendValue(candidate)
	}

	return values
}

func importProductImages(
	ctx context.Context,
	db *gorm.DB,
	storeID uuid.UUID,
	product *models.Product,
	imageURLs []string,
	defaultAltText string,
	imageUploadSvc ProductImageUploadService,
	maxImageSizeMB int64,
) []string {
	imageSvc := NewProductImageService(repo.NewProductImageRepository(db))
	existingURLs, nextPosition := loadExistingProductImageURLs(imageSvc, storeID, product.ID)

	warnings := make([]string, 0)
	for index, imageURL := range imageURLs {
		if _, exists := existingURLs[imageURL]; exists {
			continue
		}

		position := nextPosition
		altText := strings.TrimSpace(defaultAltText)
		var altTextPtr *string
		if altText != "" {
			altTextPtr = &altText
		}

		if fileType, fileSize, err := inspectRemoteImage(imageURL, maxImageSizeMB); err == nil {
			if _, err := imageSvc.Create(storeID, product.ID, dto.CreateProductImageRequest{
				URL:          imageURL,
				URLThumbnail: imageURL,
				URLMedium:    imageURL,
				URLLarge:     imageURL,
				AltText:      altTextPtr,
				Position:     position,
				FileSize:     fileSize,
				FileType:     fileType,
			}); err == nil {
				existingURLs[imageURL] = struct{}{}
				nextPosition++
				continue
			}
		}

		imageBytes, filename, contentType, err := downloadRemoteImage(imageURL, maxImageSizeMB)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("image %d could not be downloaded: %s", index+1, err))
			continue
		}

		if _, err := imageUploadSvc.CreateFromBytes(ctx, imageSvc, storeID, product.ID, ProductImageUploadInput{
			Filename:    filename,
			ContentType: contentType,
			Data:        imageBytes,
			AltText:     altTextPtr,
			Position:    &position,
		}); err != nil {
			warnings = append(warnings, fmt.Sprintf("image %d could not be imported: %s", index+1, err))
			continue
		}

		existingURLs[imageURL] = struct{}{}
		nextPosition++
	}

	return warnings
}

func loadExistingProductImageURLs(
	imageSvc ProductImageService,
	storeID uuid.UUID,
	productID uuid.UUID,
) (map[string]struct{}, int) {
	existingURLs := make(map[string]struct{})
	images, err := imageSvc.GetByProductID(storeID, productID)
	if err != nil || images == nil {
		return existingURLs, 0
	}

	for _, image := range *images {
		if trimmed := strings.TrimSpace(image.URL); trimmed != "" {
			existingURLs[trimmed] = struct{}{}
		}
	}

	return existingURLs, len(*images)
}

func inspectRemoteImage(rawURL string, maxImageSizeMB int64) (string, int64, error) {
	parsedURL, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", 0, fmt.Errorf("skipped (not a full URL)")
	}

	host := strings.Split(parsedURL.Hostname(), ":")[0]
	if host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" || host == "::1" {
		return "", 0, fmt.Errorf("skipped local image URL")
	}

	req, err := http.NewRequest(http.MethodHead, parsedURL.String(), nil)
	if err != nil {
		return "", 0, err
	}

	client := &http.Client{Timeout: 4 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", 0, fmt.Errorf("remote server returned %s", resp.Status)
	}

	contentType := strings.ToLower(strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0]))
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		return "", 0, fmt.Errorf("unsupported content type %q", contentType)
	}

	limitBytes := maxImageSizeMB * 1024 * 1024
	fileSize := directRemoteImageImportSize
	if rawSize := strings.TrimSpace(resp.Header.Get("Content-Length")); rawSize != "" {
		parsedSize, err := strconv.ParseInt(rawSize, 10, 64)
		if err != nil {
			return "", 0, fmt.Errorf("invalid content length")
		}
		if parsedSize > limitBytes {
			return "", 0, fmt.Errorf("remote image exceeds %dMB", maxImageSizeMB)
		}
		if parsedSize > 0 {
			fileSize = parsedSize
		}
	}

	return contentType, fileSize, nil
}

// extractXLSXEmbeddedImages scans each data row for pictures anchored in the
// image_url / image_urls columns (or any column if those headers aren't found).
// Returns a map of 0-based data-row index → raw image bytes.
func extractXLSXEmbeddedImages(data []byte, rows [][]string) map[int][][]byte {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil
	}
	sheets := f.GetSheetList()
	if len(sheets) == 0 || len(rows) < 2 {
		return nil
	}
	sheet := sheets[0]

	// Find image columns from the header row.
	imageCols := []int{}
	for colIdx, h := range rows[0] {
		lower := strings.ToLower(strings.TrimSpace(h))
		if lower == "image_url" || lower == "image_urls" || lower == "image" || lower == "images" {
			imageCols = append(imageCols, colIdx+1) // 1-indexed for excelize
		}
	}
	// Fallback: scan columns 20-24 (where image_url sits in the default template).
	if len(imageCols) == 0 {
		for col := 20; col <= 24; col++ {
			imageCols = append(imageCols, col)
		}
	}

	result := map[int][][]byte{}
	for dataIdx := 1; dataIdx < len(rows); dataIdx++ { // dataIdx is 0-based in rows, skip header
		excelRow := dataIdx + 1 // +1 because Excel rows are 1-indexed and row 1 is the header
		var rowImages [][]byte
		for _, col := range imageCols {
			cell, _ := excelize.CoordinatesToCellName(col, excelRow)
			pics, picErr := f.GetPictures(sheet, cell)
			if picErr != nil || len(pics) == 0 {
				continue
			}
			for _, pic := range pics {
				if len(pic.File) > 0 {
					rowImages = append(rowImages, pic.File)
				}
			}
		}
		if len(rowImages) > 0 {
			result[dataIdx-1] = rowImages // 0-based data row index used in applyProductRows
		}
	}
	return result
}

// importEmbeddedImages uploads raw image bytes that were embedded directly in
// the Excel file (as opposed to remote URLs).
func importEmbeddedImages(
	ctx context.Context,
	db *gorm.DB,
	storeID uuid.UUID,
	product *models.Product,
	images [][]byte,
	defaultAltText string,
	imageUploadSvc ProductImageUploadService,
	maxImageSizeMB int64,
) []string {
	imageSvc := NewProductImageService(repo.NewProductImageRepository(db))
	warnings := make([]string, 0)

	for i, imgBytes := range images {
		if len(imgBytes) == 0 {
			continue
		}
		contentType := strings.ToLower(strings.TrimSpace(strings.Split(http.DetectContentType(imgBytes), ";")[0]))
		ext := ".jpg"
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
		filename := fmt.Sprintf("imported-image-%d%s", i+1, ext)

		position := i
		altText := strings.TrimSpace(defaultAltText)
		var altTextPtr *string
		if altText != "" {
			altTextPtr = &altText
		}

		if _, err := imageUploadSvc.CreateFromBytes(ctx, imageSvc, storeID, product.ID, ProductImageUploadInput{
			Filename:    filename,
			ContentType: contentType,
			Data:        imgBytes,
			AltText:     altTextPtr,
			Position:    &position,
		}); err != nil {
			warnings = append(warnings, fmt.Sprintf("embedded image %d could not be imported: %s", i+1, err))
		}
	}
	return warnings
}

func prefixLineWarnings(lineNum int, warnings []string) []string {
	if len(warnings) == 0 {
		return nil
	}
	prefixed := make([]string, 0, len(warnings))
	for _, warning := range warnings {
		prefixed = append(prefixed, fmt.Sprintf("line %d: %s", lineNum, warning))
	}
	return prefixed
}

func downloadRemoteImage(rawURL string, maxImageSizeMB int64) ([]byte, string, string, error) {
	parsedURL, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, "", "", fmt.Errorf("skipped (not a full URL)")
	}

	// Skip localhost / loopback URLs — unreachable from inside Docker.
	host := strings.Split(parsedURL.Hostname(), ":")[0]
	if host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" || host == "::1" {
		return nil, "", "", fmt.Errorf("skipped local image URL")
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(parsedURL.String())
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", "", fmt.Errorf("remote server returned %s", resp.Status)
	}

	limitBytes := maxImageSizeMB * 1024 * 1024
	reader := io.LimitReader(resp.Body, limitBytes+1)
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, "", "", err
	}
	if int64(len(data)) > limitBytes {
		return nil, "", "", fmt.Errorf("remote image exceeds %dMB", maxImageSizeMB)
	}

	filename := path.Base(parsedURL.Path)
	if filename == "" || filename == "." || filename == "/" {
		filename = "imported-image"
	}

	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	return data, filename, contentType, nil
}
