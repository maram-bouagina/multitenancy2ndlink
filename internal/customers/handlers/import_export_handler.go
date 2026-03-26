package handlers

import (
	"bytes"
	"encoding/csv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"

	"multitenancypfe/internal/customers/services"
	"multitenancypfe/internal/helpers"
)

type CustomerImportExportHandler struct{}

func NewCustomerImportExportHandler() *CustomerImportExportHandler {
	return &CustomerImportExportHandler{}
}

func (h *CustomerImportExportHandler) ExportCustomers(c *fiber.Ctx) error {
	storeID, err := parseCustomerStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	switch c.Query("format", "csv") {
	case "xlsx":
		data, err := services.ExportCustomersXLSX(db, storeID)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename=\"customers.xlsx\"")
		return c.Send(data)
	default:
		data, err := services.ExportCustomersCSV(db, storeID)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", "attachment; filename=\"customers.csv\"")
		return c.Send(data)
	}
}

func (h *CustomerImportExportHandler) ImportCustomers(c *fiber.Ctx) error {
	storeID, err := parseCustomerStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	fh, err := c.FormFile("file")
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "file field is required"))
	}

	result, err := services.ImportCustomersFromFile(db, storeID, fh)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnprocessableEntity, err)
	}
	return c.JSON(result)
}

func (h *CustomerImportExportHandler) CustomerImportTemplate(c *fiber.Ctx) error {
	headers := []string{"id", "email", "first_name", "last_name", "phone", "status", "email_verified", "accepts_marketing"}
	return sendCustomerTemplate(c, "customers_template", headers, c.Query("format", "csv"))
}

func (h *CustomerImportExportHandler) ExportCustomerGroups(c *fiber.Ctx) error {
	storeID, err := parseCustomerStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	switch c.Query("format", "csv") {
	case "xlsx":
		data, err := services.ExportCustomerGroupsXLSX(db, storeID)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename=\"customer_groups.xlsx\"")
		return c.Send(data)
	default:
		data, err := services.ExportCustomerGroupsCSV(db, storeID)
		if err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "text/csv; charset=utf-8")
		c.Set("Content-Disposition", "attachment; filename=\"customer_groups.csv\"")
		return c.Send(data)
	}
}

func (h *CustomerImportExportHandler) ImportCustomerGroups(c *fiber.Ctx) error {
	storeID, err := parseCustomerStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	fh, err := c.FormFile("file")
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "file field is required"))
	}

	result, err := services.ImportCustomerGroupsFromFile(db, storeID, fh)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnprocessableEntity, err)
	}
	return c.JSON(result)
}

func (h *CustomerImportExportHandler) CustomerGroupImportTemplate(c *fiber.Ctx) error {
	headers := []string{"id", "name", "description", "discount", "member_emails"}
	return sendCustomerTemplate(c, "customer_groups_template", headers, c.Query("format", "csv"))
}

func parseCustomerStoreID(c *fiber.Ctx) (uuid.UUID, error) {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}
	return storeID, err
}

func sendCustomerTemplate(c *fiber.Ctx, name string, headers []string, format string) error {
	if format == "xlsx" {
		f := excelize.NewFile()
		sheet := "Template"
		f.SetSheetName("Sheet1", sheet)
		for col, header := range headers {
			cell, _ := excelize.CoordinatesToCellName(col+1, 1)
			_ = f.SetCellValue(sheet, cell, header)
		}
		boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
		lastHeaderCell, _ := excelize.CoordinatesToCellName(len(headers), 1)
		_ = f.SetCellStyle(sheet, "A1", lastHeaderCell, boldStyle)

		var buf bytes.Buffer
		if err := f.Write(&buf); err != nil {
			return helpers.Fail(c, fiber.StatusInternalServerError, err)
		}
		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", `attachment; filename="`+name+`.xlsx"`)
		return c.Send(buf.Bytes())
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(headers)
	w.Flush()
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="`+name+`.csv"`)
	return c.Send(buf.Bytes())
}
