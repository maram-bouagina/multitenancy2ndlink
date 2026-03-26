package handlers

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

type ProductRelationHandler struct{}

func NewProductRelationHandler() *ProductRelationHandler {
	return &ProductRelationHandler{}
}

func (h *ProductRelationHandler) getTenantRelationService(c *fiber.Ctx) services.ProductRelationService {
	return services.NewProductRelationService(repo.NewProductRelationRepository(middleware.GetTenantDB(c)))
}

// GET /api/stores/:storeId/products/:id/relations
func (h *ProductRelationHandler) GetByProduct(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := helpers.ParseID(c)
	if err != nil {
		return err
	}

	svc := h.getTenantRelationService(c)
	resp, err := svc.GetByProduct(storeID, productID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}

	return c.JSON(resp)
}

// PUT /api/stores/:storeId/products/:id/relations
func (h *ProductRelationHandler) ReplaceForProduct(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := helpers.ParseID(c)
	if err != nil {
		return err
	}

	var req dto.BulkProductRelationRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}

	svc := h.getTenantRelationService(c)
	resp, err := svc.ReplaceForProduct(storeID, productID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.JSON(resp)
}
