package services

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"mime/multipart"
	"strings"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

var collectionHeaders = []string{"id", "name", "slug", "type", "rule"}

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
		colType := models.CollectionType(get(row, "type"))
		if colType == "" {
			colType = models.CollectionManual
		}
		var rulePtr *string
		if r := get(row, "rule"); r != "" {
			rulePtr = &r
		}

		// upsert by slug
		var existing models.Collection
		err := db.Where("store_id = ? AND slug = ?", storeID, slug).First(&existing).Error
		if err == nil {
			existing.Name = name
			existing.Type = colType
			existing.Rule = rulePtr
			if err := db.Save(&existing).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: update failed: %s", lineNum, err))
				res.Skipped++
				continue
			}
			res.Updated++
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			col := models.Collection{
				ID:      uuid.New(),
				StoreID: storeID,
				Name:    name,
				Slug:    slug,
				Type:    colType,
				Rule:    rulePtr,
			}
			if err := db.Create(&col).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: create failed: %s", lineNum, err))
				res.Skipped++
				continue
			}
			res.Imported++
		} else {
			res.Errors = append(res.Errors, fmt.Sprintf("line %d: db error: %s", lineNum, err))
			res.Skipped++
		}
	}
	return res, nil
}
