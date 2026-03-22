package handlers

import (
	"bytes"
	"encoding/csv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

// ImportExportHandler handles CSV / Excel import and export for products and categories.
type ImportExportHandler struct {
	productRepo repo.ProductRepository
}

func NewImportExportHandler(pr repo.ProductRepository) *ImportExportHandler {
	return &ImportExportHandler{productRepo: pr}
}

// getCategoryRepo creates a tenant-scoped CategoryRepository (same pattern as CategoryHandler).
func (h *ImportExportHandler) getCategoryRepo(c *fiber.Ctx) repo.CategoryRepository {
	tenantDB := middleware.GetTenantDB(c)
	return repo.NewCategoryRepository(tenantDB)
}

// ── Products export ───────────────────────────────────────────────────────────

// GET /api/stores/:storeId/products/export?format=csv|xlsx
func (h *ImportExportHandler) ExportProducts(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	format := c.Query("format", "csv")

	switch format {
	case "xlsx":
		data, err := services.ExportProductsXLSX(db, storeID, h.productRepo)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename=\"products.xlsx\"")
		return c.Send(data)

	default: // csv
		data, err := services.ExportProductsCSV(db, storeID, h.productRepo)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", "attachment; filename=\"products.csv\"")
		return c.Send(data)
	}
}

// ── Products import ───────────────────────────────────────────────────────────

// POST /api/stores/:storeId/products/import   (multipart/form-data  field: "file")
func (h *ImportExportHandler) ImportProducts(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	fh, err := c.FormFile("file")
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "file field is required"))
	}

	result, err := services.ImportProductsFromFile(db, storeID, fh, h.productRepo)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnprocessableEntity, err)
	}
	return c.JSON(result)
}

// GET /api/stores/:storeId/categories/export?format=csv|xlsx
func (h *ImportExportHandler) ExportCategories(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	catRepo := h.getCategoryRepo(c)
	format := c.Query("format", "csv")

	switch format {
	case "xlsx":
		data, err := services.ExportCategoriesXLSX(db, storeID, catRepo)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename=\"categories.xlsx\"")
		return c.Send(data)

	default: // csv
		data, err := services.ExportCategoriesCSV(db, storeID, catRepo)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", "attachment; filename=\"categories.csv\"")
		return c.Send(data)
	}
}

// POST /api/stores/:storeId/categories/import   (multipart/form-data  field: "file")
func (h *ImportExportHandler) ImportCategories(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	catRepo := h.getCategoryRepo(c)

	fh, err := c.FormFile("file")
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "file field is required"))
	}

	result, err := services.ImportCategoriesFromFile(db, storeID, fh, catRepo)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnprocessableEntity, err)
	}
	return c.JSON(result)
}

// ── Template downloads ────────────────────────────────────────────────────────

// GET /api/stores/:storeId/products/import/template?format=csv|xlsx
func (h *ImportExportHandler) ProductImportTemplate(c *fiber.Ctx) error {
	_ = parseStorIDOrNil(c) // storeID not needed for template
	format := c.Query("format", "csv")
	headers := []string{
		"title", "slug", "description", "status", "visibility",
		"price", "sale_price", "currency", "sku",
		"track_stock", "stock", "low_stock_threshold",
		"weight", "dimensions", "brand", "tax_class",
		"category_slug", "category_name", "category_id",
	}
	return sendTemplate(c, "products_template", headers, format)
}

// GET /api/stores/:storeId/categories/import/template?format=csv|xlsx
func (h *ImportExportHandler) CategoryImportTemplate(c *fiber.Ctx) error {
	headers := []string{"name", "slug", "description", "visibility", "parent_slug", "parent_id"}
	return sendTemplate(c, "categories_template", headers, c.Query("format", "csv"))
}

// ── private ───────────────────────────────────────────────────────────────────

func parseStorIDOrNil(c *fiber.Ctx) *uuid.UUID {
	id, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return nil
	}
	return &id
}

func sendTemplate(c *fiber.Ctx, name string, headers []string, format string) error {
	if format == "xlsx" {
		f := excelize.NewFile()
		sheet := "Template"
		f.SetSheetName("Sheet1", sheet)
		for col, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(col+1, 1)
			_ = f.SetCellValue(sheet, cell, h)
		}
		boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
		last, _ := excelize.CoordinatesToCellName(len(headers), 1)
		_ = f.SetCellStyle(sheet, "A1", last, boldStyle)

		var buf bytes.Buffer
		if err := f.Write(&buf); err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", `attachment; filename="`+name+`.xlsx"`)
		return c.Send(buf.Bytes())
	}

	// csv
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(headers)
	w.Flush()
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="`+name+`.csv"`)
	return c.Send(buf.Bytes())
}
