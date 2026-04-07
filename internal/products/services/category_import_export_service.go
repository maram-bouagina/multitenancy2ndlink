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
	"multitenancypfe/internal/products/repo"
)

var categoryHeaders = []string{
	"id", "name", "slug", "description", "visibility", "parent_id", "parent_slug",
	"meta_title", "meta_description", "canonical_url", "noindex", "image_url",
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
	if c.MetaTitle != nil {
		row[7] = *c.MetaTitle
	}
	if c.MetaDescription != nil {
		row[8] = *c.MetaDescription
	}
	if c.CanonicalURL != nil {
		row[9] = *c.CanonicalURL
	}
	row[10] = strconv.FormatBool(c.Noindex)
	if c.ImageURL != nil {
		row[11] = *c.ImageURL
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

	dataRows := rows[1:]
	res := &ImportResult{}
	processed := make(map[int]bool, len(dataRows))
	pendingRowByID := make(map[string]int, len(dataRows))
	for rowIdx, row := range dataRows {
		if len(row) == 0 {
			continue
		}
		if rowID := get(row, "id"); rowID != "" {
			pendingRowByID[rowID] = rowIdx
		}
	}

	for len(processed) < len(dataRows) {
		progressed := false

		for rowIdx, row := range dataRows {
			if processed[rowIdx] || len(row) == 0 {
				processed[rowIdx] = true
				continue
			}

			lineNum := rowIdx + 2
			parentSlug := get(row, "parent_slug")
			parentIDRaw := get(row, "parent_id")

			if parentSlug != "" {
				resolvedID, found, err := resolveCategoryIDBySlug(db, storeID, parentSlug)
				if err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: parent lookup failed: %s", lineNum, err))
					res.Skipped++
					processed[rowIdx] = true
					progressed = true
					continue
				}
				if !found {
					continue
				}
				parentIDRaw = resolvedID.String()
			}

			if parentIDRaw != "" {
				if _, err := uuid.Parse(parentIDRaw); err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: invalid parent_id '%s'", lineNum, parentIDRaw))
					res.Skipped++
					processed[rowIdx] = true
					progressed = true
					continue
				}

				parentCategory, err := findCategoryByID(db, storeID, parentIDRaw)
				if err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: parent lookup failed: %s", lineNum, err))
					res.Skipped++
					processed[rowIdx] = true
					progressed = true
					continue
				}
				if parentCategory == nil {
					if pendingParentRowIdx, ok := pendingRowByID[parentIDRaw]; ok && !processed[pendingParentRowIdx] {
						continue
					}
				}
			}

			name := get(row, "name")
			if name == "" {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: name is required", lineNum))
				res.Skipped++
				processed[rowIdx] = true
				progressed = true
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
			if parentIDRaw != "" {
				uid, _ := uuid.Parse(parentIDRaw)
				parentID = &uid
			}

			found, err := findCategoryBySlug(db, storeID, slug)
			if err != nil {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't read this category row. Please review the file and try again.", lineNum))
				res.Skipped++
				processed[rowIdx] = true
				progressed = true
				continue
			}
			if found != nil {
				found.Name = name
				found.Description = descPtr
				found.Visibility = vis
				found.ParentID = parentID
				if v := get(row, "meta_title"); v != "" {
					found.MetaTitle = &v
				}
				if v := get(row, "meta_description"); v != "" {
					found.MetaDescription = &v
				}
				if v := get(row, "canonical_url"); v != "" {
					found.CanonicalURL = &v
				}
				found.Noindex = strings.EqualFold(get(row, "noindex"), "true")
				if v := get(row, "image_url"); v != "" {
					found.ImageURL = &v
				}
				if err := r.Update(found); err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't update this category. Please try again.", lineNum))
					res.Skipped++
					processed[rowIdx] = true
					progressed = true
					continue
				}
				res.Updated++
			} else {
				var metaTitlePtr, metaDescPtr, canonURLPtr, imgURLPtr *string
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
				cat := &models.Category{
					StoreID:         storeID,
					Name:            name,
					Slug:            slug,
					Description:     descPtr,
					Visibility:      vis,
					ParentID:        parentID,
					MetaTitle:       metaTitlePtr,
					MetaDescription: metaDescPtr,
					CanonicalURL:    canonURLPtr,
					Noindex:         strings.EqualFold(get(row, "noindex"), "true"),
					ImageURL:        imgURLPtr,
				}
				if err := r.Create(cat); err != nil {
					res.Errors = append(res.Errors, fmt.Sprintf("line %d: we couldn't save this category. Please check for duplicate names and try again.", lineNum))
					res.Skipped++
					processed[rowIdx] = true
					progressed = true
					continue
				}
				res.Imported++
			}

			processed[rowIdx] = true
			progressed = true
		}

		if progressed {
			continue
		}

		for rowIdx, row := range dataRows {
			if processed[rowIdx] || len(row) == 0 {
				continue
			}
			lineNum := rowIdx + 2
			parentSlug := get(row, "parent_slug")
			if parentSlug != "" {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: the parent category was not found. Please add it first or include it in the file.", lineNum))
			} else {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: the parent category was not found. Please add it first or include it in the file.", lineNum))
			}
			res.Skipped++
			processed[rowIdx] = true
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

func findCategoryByID(db *gorm.DB, storeID uuid.UUID, id string) (*models.Category, error) {
	categoryID, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}

	var c models.Category
	err = db.Where("store_id = ? AND id = ?", storeID, categoryID).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}
