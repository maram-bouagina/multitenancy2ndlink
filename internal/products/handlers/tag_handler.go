package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

type TagHandler struct {
}

func NewTagHandler() *TagHandler {
	return &TagHandler{}
}

// getTenantTagService creates a service with the tenant-scoped database
func (h *TagHandler) getTenantTagService(c *fiber.Ctx) services.TagService {
	tenantDB := middleware.GetTenantDB(c)
	return services.NewTagService(repo.NewTagRepository(tenantDB))
}

// POST /api/stores/:storeId/tags
func (h *TagHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	var req dto.CreateTagRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	resp, err := svc.Create(storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores/:storeId/tags
func (h *TagHandler) GetAll(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	resp, err := svc.GetAll(storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(resp)
}

// GET /api/stores/:storeId/tags/:id
func (h *TagHandler) GetByID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	resp, err := svc.GetByID(id, storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(resp)
}

// PUT /api/stores/:storeId/tags/:id
func (h *TagHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateTagRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	resp, err := svc.Update(id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// DELETE /api/stores/:storeId/tags/:id
func (h *TagHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	if err := svc.Delete(id, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// POST /api/stores/:storeId/products/:productId/tags (bulk assign)
func (h *TagHandler) AssignToProduct(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	var req dto.ProductTagsRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantTagService(c)
	if err := svc.AssignToProduct(storeID, productID, req.TagIDs); err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
