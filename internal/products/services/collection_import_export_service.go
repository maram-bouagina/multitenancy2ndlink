package services

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

var collectionHeaders = []string{
	"id", "name", "slug", "type", "rule",
	"description", "meta_title", "meta_description", "canonical_url", "noindex", "image_url",
}

// ── Export ────────────────────────────────────────────────────────────────────

func ExportCollectionsCSV(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	cols, err := fetchAllCollections(db, storeID)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(collectionHeaders)
	for _, c := range cols {
		_ = w.Write(collectionToRow(c))
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

func ExportCollectionsXLSX(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	cols, err := fetchAllCollections(db, storeID)
	if err != nil {
		return nil, err
	}
	f := excelize.NewFile()
	sheet := "Collections"
	f.SetSheetName("Sheet1", sheet)
	for col, h := range collectionHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	last, _ := excelize.CoordinatesToCellName(len(collectionHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", last, boldStyle)

	for rowIdx, c := range cols {
		for col, val := range collectionToRow(c) {
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

// ── Import ───────────────────────────────────────────────────────────────────

func ImportCollectionsFromFile(db *gorm.DB, storeID uuid.UUID, fh *multipart.FileHeader) (*ImportResult, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	ext := strings.ToLower(fh.Filename)
	var rows [][]string
	switch {
	case strings.HasSuffix(ext, ".csv"):
		rows, err = ParseCSV(f)
	case strings.HasSuffix(ext, ".xlsx"):
		rows, err = ParseXLSX(f)
	default:
		return nil, errors.New("unsupported file format: use .csv or .xlsx")
	}
	if err != nil {
		return nil, err
	}
	return applyCollectionRows(db, storeID, rows)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func fetchAllCollections(db *gorm.DB, storeID uuid.UUID) ([]models.Collection, error) {
	var cols []models.Collection
	err := db.Where("store_id = ?", storeID).Order("name ASC").Find(&cols).Error
	return cols, err
}

func collectionToRow(c models.Collection) []string {
	row := make([]string, len(collectionHeaders))
	row[0] = c.ID.String()
	row[1] = c.Name
	row[2] = c.Slug
	row[3] = string(c.Type)
	if c.Rule != nil {
		row[4] = *c.Rule
	}
	if c.Description != nil {
		row[5] = *c.Description
	}
	if c.MetaTitle != nil {
		row[6] = *c.MetaTitle
	}
	if c.MetaDescription != nil {
		row[7] = *c.MetaDescription
	}
	if c.CanonicalURL != nil {
		row[8] = *c.CanonicalURL
	}
	row[9] = strconv.FormatBool(c.Noindex)
	if c.ImageURL != nil {
		row[10] = *c.ImageURL
	}
	return row
}

func applyCollectionRows(db *gorm.DB, storeID uuid.UUID, rows [][]string) (*ImportResult, error) {
	if len(rows) < 2 {
		return &ImportResult{}, nil
	}
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
	seenSlugs := map[string]struct{}{}
	for lineNo, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}
		lineNum := lineNo + 2

		name := get(row, "name")
		if name == "" {
			res.Errors = append(res.Errors, fmt.Sprintf("line %d: name is required", lineNum))
			res.Skipped++
			continue
		}
		slug := get(row, "slug")
		if slug == "" {
			slug = generateSlug(name)
		}
		slug = ensureUniqueCollectionSlug(db, storeID, slug, seenSlugs)
		seenSlugs[slug] = struct{}{}
		colType := models.CollectionType(get(row, "type"))
		if colType == "" {
			colType = models.CollectionManual
		}
		var rulePtr *string
		if r := get(row, "rule"); r != "" {
			rulePtr = &r
		}

		// SEO fields
		var descPtr, metaTitlePtr, metaDescPtr, canonURLPtr, imgURLPtr *string
		if v := get(row, "description"); v != "" {
			descPtr = &v
		}
		if v := get(row, "meta_title"); v != "" {
			metaTitlePtr = &v
		}
		if v := get(row, "meta_description"); v != "" {
			metaDescPtr = &v
		}
		if v := get(row, "canonical_url"); v != "" {
			canonURLPtr = &v
		}
		if v := get(row, "image_url"); v != "" {
			imgURLPtr = &v
		}
		noindex := strings.EqualFold(get(row, "noindex"), "true")

		// upsert by slug
		var existing models.Collection
		err := db.Where("store_id = ? AND slug = ?", storeID, slug).First(&existing).Error
		if err == nil {
			existing.Name = name
			existing.Type = colType
			existing.Rule = rulePtr
			existing.Description = descPtr
			existing.MetaTitle = metaTitlePtr
			existing.MetaDescription = metaDescPtr
			existing.CanonicalURL = canonURLPtr
			existing.Noindex = noindex
			existing.ImageURL = imgURLPtr
			if err := db.Save(&existing).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't update this collection. Please try again.", lineNum))
				res.Skipped++
				continue
			}
			res.Updated++
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			col := models.Collection{
				ID:              uuid.New(),
				StoreID:         storeID,
				Name:            name,
				Slug:            slug,
				Type:            colType,
				Rule:            rulePtr,
				Description:     descPtr,
				MetaTitle:       metaTitlePtr,
				MetaDescription: metaDescPtr,
				CanonicalURL:    canonURLPtr,
				Noindex:         noindex,
				ImageURL:        imgURLPtr,
			}
			if err := db.Create(&col).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't save this collection. Please check the file and try again.", lineNum))
				res.Skipped++
				continue
			}
			res.Imported++
		} else {
			res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't read this row. Please review the file and try again.", lineNum))
			res.Skipped++
		}

	}
	return res, nil
}

func ensureUniqueCollectionSlug(db *gorm.DB, storeID uuid.UUID, slug string, seenSlugs map[string]struct{}) string {
	base := slug
	if base == "" {
		base = "collection"
	}

	makeCandidate := func(n int) string {
		if n <= 1 {
			return base
		}
		return fmt.Sprintf("%s-%d", base, n)
	}

	for suffix := 1; ; suffix++ {
		candidate := makeCandidate(suffix)
		if seenSlugs != nil {
			if _, ok := seenSlugs[candidate]; ok {
				continue
			}
		}

		var count int64
		_ = db.Model(&models.Collection{}).
			Where("store_id = ? AND slug = ?", storeID, candidate).
			Count(&count).Error
		if count == 0 {
			return candidate
		}
	}
}
