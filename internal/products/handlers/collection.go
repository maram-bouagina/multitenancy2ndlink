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

type CollectionHandler struct {
}

func NewCollectionHandler() *CollectionHandler {
	return &CollectionHandler{}
}

// getTenantCollectionService creates a service with the tenant-scoped database
func (h *CollectionHandler) getTenantCollectionService(c *fiber.Ctx) services.CollectionService {
	tenantDB := middleware.GetTenantDB(c)
	return services.NewCollectionService(repo.NewCollectionRepository(tenantDB))
}

// POST /api/stores/:storeId/collections
func (h *CollectionHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	var req dto.CreateCollectionRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantCollectionService(c)
	resp, err := svc.Create(storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores/:storeId/collections
func (h *CollectionHandler) GetAll(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCollectionService(c)
	resp, err := svc.GetAll(storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(resp)
}

// GET /api/stores/:storeId/collections/:id
func (h *CollectionHandler) GetByID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCollectionService(c)
	resp, err := svc.GetByID(id, storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(resp)
}

// PUT /api/stores/:storeId/collections/:id
func (h *CollectionHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateCollectionRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	svc := h.getTenantCollectionService(c)
	resp, err := svc.Update(id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// DELETE /api/stores/:storeId/collections/:id
func (h *CollectionHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	svc := h.getTenantCollectionService(c)
	if err := svc.Delete(id, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GET /api/stores/:storeId/collections/:id/products
func (h *CollectionHandler) GetProducts(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	svc := h.getTenantCollectionService(c)
	resp, err := svc.GetProducts(id, storeID, page, limit)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(resp)
}

// POST /api/stores/:storeId/collections/:id/products/:productId
func (h *CollectionHandler) AddProduct(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	svc := h.getTenantCollectionService(c)
	if err := svc.AddProduct(id, productID, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DELETE /api/stores/:storeId/collections/:id/products/:productId
func (h *CollectionHandler) RemoveProduct(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	svc := h.getTenantCollectionService(c)
	if err := svc.RemoveProduct(id, productID, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
