package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	authHandlers "multitenancypfe/internal/helpers"
	"multitenancypfe/internal/store/dto"
	"multitenancypfe/internal/store/services"
)

type StoreHandler struct {
	svc services.StoreService
}

func NewStoreHandler(svc services.StoreService) *StoreHandler {
	return &StoreHandler{svc: svc}
}

// POST /api/stores
func (h *StoreHandler) Create(c *fiber.Ctx) error {
	tenantID, err := parseTenantID(c)
	if err != nil {
		return err
	}
	var req dto.CreateStoreRequest
	if err := authHandlers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Create(tenantID, req)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores
func (h *StoreHandler) GetAll(c *fiber.Ctx) error {
	tenantID, err := parseTenantID(c)
	if err != nil {
		return err
	}
	stores, err := h.svc.GetByTenantID(tenantID)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(stores)
}

// GET /api/stores/:id
func (h *StoreHandler) GetByID(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}
	store, err := h.svc.GetByID(id)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(store)
}

// PUT /api/stores/:id
func (h *StoreHandler) Update(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateStoreRequest
	if err := authHandlers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Update(id, req)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// POST /api/stores/:id/customization/publish
func (h *StoreHandler) PublishCustomization(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}

	var req dto.PublishStoreCustomizationRequest
	if len(c.Body()) > 0 {
		if err := authHandlers.ParseBody(c, &req); err != nil {
			return err
		}
	}

	resp, err := h.svc.PublishCustomization(id, req)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.JSON(resp)
}

// DELETE /api/stores/:id
func (h *StoreHandler) Delete(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return authHandlers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ── helper ───────────────────────────────────────────────────────────────────

func parseTenantID(c *fiber.Ctx) (uuid.UUID, error) {
	raw, _ := c.Locals("tenantID").(string)
	id, err := uuid.Parse(raw)
	if err != nil {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant not identified"})
	}
	return id, err
}
