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
	"multitenancypfe/internal/products/repo"
)

var categoryHeaders = []string{
	"id", "name", "slug", "description", "visibility", "parent_id", "parent_slug",
}

// ── ExportCategoriesCSV ───────────────────────────────────────────────────────

func ExportCategoriesCSV(db *gorm.DB, storeID uuid.UUID, r repo.CategoryRepository) ([]byte, error) {
	cats, err := fetchAllCategories(db, storeID)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(categoryHeaders)
	for _, c := range cats {
		_ = w.Write(categoryToRow(c))
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

// ── ExportCategoriesXLSX ──────────────────────────────────────────────────────

func ExportCategoriesXLSX(db *gorm.DB, storeID uuid.UUID, r repo.CategoryRepository) ([]byte, error) {
	cats, err := fetchAllCategories(db, storeID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Categories"
	f.SetSheetName("Sheet1", sheet)

	for col, h := range categoryHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	lastCell, _ := excelize.CoordinatesToCellName(len(categoryHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", lastCell, boldStyle)

	for rowIdx, c := range cats {
		for col, val := range categoryToRow(c) {
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

// ── ImportCategories ──────────────────────────────────────────────────────────

func ImportCategoriesFromFile(
	db *gorm.DB,
	storeID uuid.UUID,
	fh *multipart.FileHeader,
	r repo.CategoryRepository,
) (*ImportResult, error) {
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

	return applyCategoryRows(db, storeID, rows, r)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func fetchAllCategories(db *gorm.DB, storeID uuid.UUID) ([]models.Category, error) {
	var cats []models.Category
	err := db.Where("store_id = ?", storeID).Order("name ASC").Find(&cats).Error
	return cats, err
}

func categoryToRow(c models.Category) []string {
	row := make([]string, len(categoryHeaders))
	row[0] = c.ID.String()
	row[1] = c.Name
	row[2] = c.Slug
	if c.Description != nil {
		row[3] = *c.Description
	}
	row[4] = string(c.Visibility)
	if c.ParentID != nil {
		row[5] = c.ParentID.String()
	}
	return row
}

func applyCategoryRows(
	db *gorm.DB,
	storeID uuid.UUID,
	rows [][]string,
	r repo.CategoryRepository,
) (*ImportResult, error) {
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

		vis := models.CategoryVisibility(get(row, "visibility"))
		if vis == "" {
			vis = models.CategoryPublic
		}

		var descPtr *string
		if v := get(row, "description"); v != "" {
			descPtr = &v
		}

		var parentID *uuid.UUID
		if v := get(row, "parent_id"); v != "" {
			if uid, err := uuid.Parse(v); err == nil {
				parentID = &uid
			}
		}

		if parentID == nil {
			if parentSlug := get(row, "parent_slug"); parentSlug != "" {
				resolvedID, found, err := resolveCategoryIDBySlug(db, storeID, parentSlug)
				if err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: parent lookup failed: %s", lineNum, err))
					res.Skipped++
					continue
				}
				if found {
					parentID = &resolvedID
				} else {
					res.Warnings = append(res.Warnings, fmt.Sprintf("line %d: parent_slug '%s' not found, category imported as root", lineNum, parentSlug))
				}
			}
		}

		found, err := findCategoryBySlug(db, storeID, slug)
		if err != nil {
			res.Errors = append(res.Errors, fmt.Sprintf("line %d: db error: %s", lineNum, err))
			res.Skipped++
			continue
		}
		if found != nil {
			found.Name = name
			found.Description = descPtr
			found.Visibility = vis
			found.ParentID = parentID
			if err := r.Update(found); err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: update failed: %s", lineNum, err))
				res.Skipped++
				continue
			}
			res.Updated++
		} else {
			cat := &models.Category{
				StoreID:     storeID,
				Name:        name,
				Slug:        slug,
				Description: descPtr,
				Visibility:  vis,
				ParentID:    parentID,
			}
			if err := r.Create(cat); err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: create failed: %s", lineNum, err))
				res.Skipped++
				continue
			}
			res.Imported++
		}
	}

	return res, nil
}

func findCategoryBySlug(db *gorm.DB, storeID uuid.UUID, slug string) (*models.Category, error) {
	var c models.Category
	err := db.Where("store_id = ? AND slug = ?", storeID, slug).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}
