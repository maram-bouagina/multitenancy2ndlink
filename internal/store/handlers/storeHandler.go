package handlers

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	authHandlers "multitenancypfe/internal/helpers"
	"multitenancypfe/internal/media"
	"multitenancypfe/internal/store/dto"
	"multitenancypfe/internal/store/services"
)

type StoreHandler struct {
	svc     services.StoreService
	storage media.Storage
}

func NewStoreHandler(svc services.StoreService, storage media.Storage) *StoreHandler {
	return &StoreHandler{svc: svc, storage: storage}
}

// POST /api/stores
func (h *StoreHandler) Create(c *fiber.Ctx) error {
	tenantID, err := parseTenantID(c)
	if err != nil {
		return err
	}
	db := authHandlers.GetTenantDB(c)
	var req dto.CreateStoreRequest
	if err := authHandlers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Create(db, tenantID, req)
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
	db := authHandlers.GetTenantDB(c)
	stores, err := h.svc.GetByTenantID(db, tenantID)
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
	db := authHandlers.GetTenantDB(c)
	store, err := h.svc.GetByID(db, id)
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
	db := authHandlers.GetTenantDB(c)
	var req dto.UpdateStoreRequest
	if err := authHandlers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Update(db, id, req)
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
	db := authHandlers.GetTenantDB(c)

	var req dto.PublishStoreCustomizationRequest
	if len(c.Body()) > 0 {
		if err := authHandlers.ParseBody(c, &req); err != nil {
			return err
		}
	}

	resp, err := h.svc.PublishCustomization(db, id, req)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// PATCH /api/stores/:id/status
func (h *StoreHandler) UpdateStatus(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}
	db := authHandlers.GetTenantDB(c)
	var req dto.UpdateStoreStatusRequest
	if err := authHandlers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.UpdateStatus(db, id, req)
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
	db := authHandlers.GetTenantDB(c)

	if err := h.svc.Delete(db, id); err != nil {
		return authHandlers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// POST /api/stores/:id/logo
func (h *StoreHandler) UploadLogo(c *fiber.Ctx) error {
	id, err := authHandlers.ParseID(c)
	if err != nil {
		return err
	}
	db := authHandlers.GetTenantDB(c)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("file is required"))
	}

	if fileHeader.Size > 2*1024*1024 {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("file must be under 2 MB"))
	}

	ct := fileHeader.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("only image files are allowed"))
	}

	f, err := fileHeader.Open()
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, err)
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, err)
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		ext = ".png"
	}
	key := fmt.Sprintf("store-logos/%s%s", uuid.New().String(), ext)

	if err := h.storage.Upload(c.Context(), key, data, http.DetectContentType(data)); err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, fmt.Errorf("upload failed"))
	}

	logoURL := "/media/" + key
	resp, err := h.svc.Update(db, id, dto.UpdateStoreRequest{Logo: &logoURL})
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// POST /api/stores/:id/media
func (h *StoreHandler) UploadMedia(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("file is required"))
	}

	if fileHeader.Size > 5*1024*1024 {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("file must be under 5 MB"))
	}

	ct := fileHeader.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return authHandlers.Fail(c, fiber.StatusBadRequest, fmt.Errorf("only image files are allowed"))
	}

	f, err := fileHeader.Open()
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, err)
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, err)
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		ext = ".png"
	}
	key := fmt.Sprintf("store-media/%s%s", uuid.New().String(), ext)

	if err := h.storage.Upload(c.Context(), key, data, http.DetectContentType(data)); err != nil {
		return authHandlers.Fail(c, fiber.StatusInternalServerError, fmt.Errorf("upload failed"))
	}

	return c.JSON(fiber.Map{"url": "/media/" + key})
}

// ── helper ───────────────────────────────────────────────────────────────────

func parseTenantID(c *fiber.Ctx) (string, error) {
	raw, _ := c.Locals("tenantID").(string)
	if raw == "" {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant not identified"})
		return "", fiber.NewError(fiber.StatusUnauthorized, "tenant not identified")
	}
	return raw, nil
}
