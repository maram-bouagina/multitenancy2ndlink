package services

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

// ── Full catalog XLSX (one workbook, many sheets) ────────────────────────────

func ExportFullCatalogXLSX(db *gorm.DB, storeID uuid.UUID, productRepo repo.ProductRepository) ([]byte, error) {
	f := excelize.NewFile()
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})

	// ── Products sheet ────────────────────────────────────────────────────
	f.SetSheetName("Sheet1", "Products")
	writeSheetHeaders(f, "Products", productHeaders, boldStyle)
	products, err := productRepo.FindAllForExport(db, storeID)
	if err != nil {
		return nil, fmt.Errorf("export products: %w", err)
	}
	for i, p := range products {
		for col, val := range productToRow(p) {
			cell, _ := excelize.CoordinatesToCellName(col+1, i+2)
			_ = f.SetCellValue("Products", cell, val)
		}
	}

	// ── Categories sheet ──────────────────────────────────────────────────
	f.NewSheet("Categories")
	writeSheetHeaders(f, "Categories", categoryHeaders, boldStyle)
	cats, err := fetchAllCategories(db, storeID)
	if err != nil {
		return nil, fmt.Errorf("export categories: %w", err)
	}
	for i, c := range cats {
		for col, val := range categoryToRow(c) {
			cell, _ := excelize.CoordinatesToCellName(col+1, i+2)
			_ = f.SetCellValue("Categories", cell, val)
		}
	}

	// ── Tags sheet ────────────────────────────────────────────────────────
	f.NewSheet("Tags")
	writeSheetHeaders(f, "Tags", tagHeaders, boldStyle)
	tags, err := fetchAllTags(db, storeID)
	if err != nil {
		return nil, fmt.Errorf("export tags: %w", err)
	}
	for i, t := range tags {
		for col, val := range tagToRow(t) {
			cell, _ := excelize.CoordinatesToCellName(col+1, i+2)
			_ = f.SetCellValue("Tags", cell, val)
		}
	}

	// ── Collections sheet ─────────────────────────────────────────────────
	f.NewSheet("Collections")
	writeSheetHeaders(f, "Collections", collectionHeaders, boldStyle)
	cols, err := fetchAllCollections(db, storeID)
	if err != nil {
		return nil, fmt.Errorf("export collections: %w", err)
	}
	for i, c := range cols {
		for col, val := range collectionToRow(c) {
			cell, _ := excelize.CoordinatesToCellName(col+1, i+2)
			_ = f.SetCellValue("Collections", cell, val)
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func writeSheetHeaders(f *excelize.File, sheet string, headers []string, style int) {
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	last, _ := excelize.CoordinatesToCellName(len(headers), 1)
	_ = f.SetCellStyle(sheet, "A1", last, style)
}

// ── Purge catalog (hard-delete everything for a clean re-import) ─────────────

type PurgeResult struct {
	Products    int64 `json:"products"`
	Categories  int64 `json:"categories"`
	Tags        int64 `json:"tags"`
	Collections int64 `json:"collections"`
	Images      int64 `json:"images"`
	Relations   int64 `json:"relations"`
}

func PurgeCatalog(db *gorm.DB, storeID uuid.UUID) (*PurgeResult, error) {
	res := &PurgeResult{}

	// Order matters: remove join tables and dependents first.

	// 1. Product-tag associations
	if r := db.Exec("DELETE FROM product_tags WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)", storeID); r.Error != nil {
		return nil, fmt.Errorf("purge product_tags: %w", r.Error)
	}

	// 2. Collection-product associations
	if r := db.Exec("DELETE FROM collection_products WHERE collection_id IN (SELECT id FROM collections WHERE store_id = ?)", storeID); r.Error != nil {
		return nil, fmt.Errorf("purge collection_products: %w", r.Error)
	}

	// 3. Product relations (hard delete — ignores soft-delete column)
	r := db.Exec("DELETE FROM product_relations WHERE source_product_id IN (SELECT id FROM products WHERE store_id = ?)", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge relations: %w", r.Error)
	}
	res.Relations = r.RowsAffected

	// 4. Product images (hard delete)
	r = db.Exec("DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge images: %w", r.Error)
	}
	res.Images = r.RowsAffected

	// 5. Stock reservations + logs
	db.Exec("DELETE FROM stock_reservations WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)", storeID)
	db.Exec("DELETE FROM stock_adjustment_logs WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)", storeID)

	// 6. Products (hard delete — including soft-deleted)
	r = db.Exec("DELETE FROM products WHERE store_id = ?", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge products: %w", r.Error)
	}
	res.Products = r.RowsAffected

	// 7. Tags (hard delete — including soft-deleted)
	r = db.Exec("DELETE FROM tags WHERE store_id = ?", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge tags: %w", r.Error)
	}
	res.Tags = r.RowsAffected

	// 8. Categories
	r = db.Exec("DELETE FROM categories WHERE store_id = ?", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge categories: %w", r.Error)
	}
	res.Categories = r.RowsAffected

	// 9. Collections
	r = db.Exec("DELETE FROM collections WHERE store_id = ?", storeID)
	if r.Error != nil {
		return nil, fmt.Errorf("purge collections: %w", r.Error)
	}
	res.Collections = r.RowsAffected

	return res, nil
}

// ── Duplicate detection ──────────────────────────────────────────────────────

type DuplicateGroup struct {
	Field    string           `json:"field"` // "title" | "sku" | "slug"
	Value    string           `json:"value"`
	Products []DuplicateEntry `json:"products"`
}

type DuplicateEntry struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	SKU   string `json:"sku"`
	Slug  string `json:"slug"`
}

func FindDuplicates(db *gorm.DB, storeID uuid.UUID) ([]DuplicateGroup, error) {
	var products []models.Product
	if err := db.Where("store_id = ? AND deleted_at IS NULL", storeID).Find(&products).Error; err != nil {
		return nil, err
	}

	groups := make([]DuplicateGroup, 0)

	// Group by normalized title
	titleMap := map[string][]models.Product{}
	for _, p := range products {
		key := strings.TrimSpace(strings.ToLower(p.Title))
		titleMap[key] = append(titleMap[key], p)
	}
	for _, prods := range titleMap {
		if len(prods) < 2 {
			continue
		}
		g := DuplicateGroup{Field: "title", Value: prods[0].Title}
		for _, p := range prods {
			g.Products = append(g.Products, toDuplicateEntry(p))
		}
		groups = append(groups, g)
	}

	// Group by SKU (only products that have one)
	skuMap := map[string][]models.Product{}
	for _, p := range products {
		if p.SKU == nil || *p.SKU == "" {
			continue
		}
		key := strings.TrimSpace(strings.ToLower(*p.SKU))
		skuMap[key] = append(skuMap[key], p)
	}
	for _, prods := range skuMap {
		if len(prods) < 2 {
			continue
		}
		g := DuplicateGroup{Field: "sku", Value: *prods[0].SKU}
		for _, p := range prods {
			g.Products = append(g.Products, toDuplicateEntry(p))
		}
		groups = append(groups, g)
	}

	return groups, nil
}

func toDuplicateEntry(p models.Product) DuplicateEntry {
	sku := ""
	if p.SKU != nil {
		sku = *p.SKU
	}
	return DuplicateEntry{
		ID:    p.ID.String(),
		Title: p.Title,
		SKU:   sku,
		Slug:  p.Slug,
	}
}
