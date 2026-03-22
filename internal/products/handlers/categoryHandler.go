package handlers

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

type CategoryHandler struct {
}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{}
}

// getTenantCategoryService creates a service with the tenant-scoped database
func (h *CategoryHandler) getTenantCategoryService(c *fiber.Ctx) services.CategoryService {
	tenantDB := middleware.GetTenantDB(c)
	return services.NewCategoryService(repo.NewCategoryRepository(tenantDB))
}

// POST /api/stores/:storeId/categories
func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	var req dto.CreateCategoryRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantCategoryService(c)
	resp, err := svc.Create(storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores/:storeId/categories
func (h *CategoryHandler) GetTree(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCategoryService(c)
	resp, err := svc.GetTree(storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(resp)
}

// GET /api/stores/:storeId/categories/:id
func (h *CategoryHandler) GetByID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCategoryService(c)
	resp, err := svc.GetByID(id, storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(resp)
}

// PUT /api/stores/:storeId/categories/:id
func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateCategoryRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantCategoryService(c)
	resp, err := svc.Update(id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// DELETE /api/stores/:storeId/categories/:id
func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCategoryService(c)
	if err := svc.Delete(id, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusConflict, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
