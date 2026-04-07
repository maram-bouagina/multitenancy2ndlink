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

var tagHeaders = []string{"id", "name", "slug", "color"}

// ── Export ────────────────────────────────────────────────────────────────────

func ExportTagsCSV(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	tags, err := fetchAllTags(db, storeID)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(tagHeaders)
	for _, t := range tags {
		_ = w.Write(tagToRow(t))
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

func ExportTagsXLSX(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	tags, err := fetchAllTags(db, storeID)
	if err != nil {
		return nil, err
	}
	f := excelize.NewFile()
	sheet := "Tags"
	f.SetSheetName("Sheet1", sheet)
	for col, h := range tagHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	last, _ := excelize.CoordinatesToCellName(len(tagHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", last, boldStyle)

	for rowIdx, t := range tags {
		for col, val := range tagToRow(t) {
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

func ImportTagsFromFile(db *gorm.DB, storeID uuid.UUID, fh *multipart.FileHeader) (*ImportResult, error) {
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
	return applyTagRows(db, storeID, rows)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func fetchAllTags(db *gorm.DB, storeID uuid.UUID) ([]models.Tag, error) {
	var tags []models.Tag
	err := db.Where("store_id = ? AND deleted_at IS NULL", storeID).Order("name ASC").Find(&tags).Error
	return tags, err
}

func tagToRow(t models.Tag) []string {
	row := make([]string, len(tagHeaders))
	row[0] = t.ID.String()
	row[1] = t.Name
	row[2] = t.Slug
	if t.Color != nil {
		row[3] = *t.Color
	}
	return row
}

func applyTagRows(db *gorm.DB, storeID uuid.UUID, rows [][]string) (*ImportResult, error) {
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

		var colorPtr *string
		if c := get(row, "color"); c != "" {
			colorPtr = &c
		}

		// upsert by slug
		var existing models.Tag
		err := db.Where("store_id = ? AND slug = ? AND deleted_at IS NULL", storeID, slug).First(&existing).Error
		if err == nil {
			existing.Name = name
			existing.Color = colorPtr
			if err := db.Save(&existing).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't update this tag. Please try again.", lineNum))
				res.Skipped++
				continue
			}
			res.Updated++
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			tag := models.Tag{
				ID:      uuid.New(),
				StoreID: storeID,
				Name:    name,
				Slug:    slug,
				Color:   colorPtr,
			}
			if err := db.Create(&tag).Error; err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't save this tag. Please check for duplicate names and try again.", lineNum))
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
