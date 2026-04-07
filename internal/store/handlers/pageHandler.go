package handlers

import (
	h "multitenancypfe/internal/helpers"
	"multitenancypfe/internal/store/dto"
	"multitenancypfe/internal/store/models"
	"multitenancypfe/internal/store/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PageHandler struct{ svc services.PageService }

func NewPageHandler(svc services.PageService) *PageHandler { return &PageHandler{svc: svc} }

// GET /api/stores/:storeId/pages
func (ph *PageHandler) List(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := h.GetTenantDB(c)
	pages, err := ph.svc.List(db, storeID)
	if err != nil {
		return h.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(pages)
}

// GET /api/stores/:storeId/pages/:pageId
func (ph *PageHandler) GetByID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	db := h.GetTenantDB(c)
	page, err := ph.svc.GetByID(db, pageID, storeID)
	if err != nil {
		return h.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(page)
}

// POST /api/stores/:storeId/pages
func (ph *PageHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	var req dto.CreatePageRequest
	if err := h.ParseBody(c, &req); err != nil {
		return err
	}
	db := h.GetTenantDB(c)
	page, err := ph.svc.Create(db, storeID, req)
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(page)
}

// PUT /api/stores/:storeId/pages/:pageId
func (ph *PageHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	var req dto.UpdatePageRequest
	if err := h.ParseBody(c, &req); err != nil {
		return err
	}
	db := h.GetTenantDB(c)
	page, err := ph.svc.Update(db, pageID, storeID, req)
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(page)
}

// POST /api/stores/:storeId/pages/:pageId/publish
func (ph *PageHandler) Publish(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	db := h.GetTenantDB(c)
	page, err := ph.svc.Publish(db, pageID, storeID)
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(page)
}

// DELETE /api/stores/:storeId/pages/:pageId
func (ph *PageHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	db := h.GetTenantDB(c)
	if err := ph.svc.Delete(db, pageID, storeID); err != nil {
		return h.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GET /api/public/stores/:slug/pages/:pageSlug  (vitrine publique)
func (ph *PageHandler) GetPublic(c *fiber.Ctx) error {
	db, _ := c.Locals("sfDB").(*gorm.DB) // posé par StoreContextMiddleware
	store, _ := c.Locals("sfStore").(*models.Store)
	if db == nil || store == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "store context missing"})
	}
	pageSlug := c.Params("pageSlug")
	page, err := ph.svc.GetBySlug(db, pageSlug, store.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "page not found"})
	}
	return c.JSON(page)
}

// GET /api/public/stores/:slug/pages  (list published pages for navigation)
func (ph *PageHandler) ListPublic(c *fiber.Ctx) error {
	db, _ := c.Locals("sfDB").(*gorm.DB)
	store, _ := c.Locals("sfStore").(*models.Store)
	if db == nil || store == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "store context missing"})
	}
	pages, err := ph.svc.ListPublic(db, store.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list pages"})
	}
	return c.JSON(pages)
}

func parseStoreID(c *fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}
	return id, err
}
