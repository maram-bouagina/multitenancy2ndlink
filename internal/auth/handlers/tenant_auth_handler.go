package handlers

import (
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/auth/dto"
	"multitenancypfe/internal/auth/services"
	"multitenancypfe/internal/helpers"
)

const authCookieName = "auth_token"

func isSecureCookie() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("AUTH_COOKIE_SECURE")))
	if raw == "" {
		return false
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return false
	}
	return parsed
}

func authCookieExpirySeconds() int {
	raw := strings.TrimSpace(os.Getenv("AUTH_COOKIE_EXPIRES_SECONDS"))
	if raw == "" {
		return 60 * 60 * 24
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return 60 * 60 * 24
	}
	return seconds
}

// ─── CRUD Handler ─────────────────────────────────────────────────────────────

type TenantHandler struct {
	svc services.TenantService
}

func NewTenantHandler(svc services.TenantService) *TenantHandler {
	return &TenantHandler{svc: svc}
}

func (h *TenantHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateTenantRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Create(req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *TenantHandler) GetAll(c *fiber.Ctx) error {
	tenants, err := h.svc.GetAll()
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(tenants)
}

func (h *TenantHandler) GetByID(c *fiber.Ctx) error {
	id, err := helpers.ParseStringID(c)
	if err != nil {
		return err
	}
	tenant, err := h.svc.GetByID(id)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(tenant)
}

func (h *TenantHandler) Update(c *fiber.Ctx) error {
	id, err := helpers.ParseStringID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateTenantRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Update(id, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

func (h *TenantHandler) Delete(c *fiber.Ctx) error {
	id, err := helpers.ParseStringID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ─── Auth Handler ─────────────────────────────────────────────────────────────

type TenantAuthHandler struct {
	svc services.TenantAuthService
}

func NewTenantAuthHandler(svc services.TenantAuthService) *TenantAuthHandler {
	return &TenantAuthHandler{svc: svc}
}

// POST /api/auth/tenant/login
func (h *TenantAuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Login(req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnauthorized, err)
	}

	c.Cookie(&fiber.Cookie{
		Name:     authCookieName,
		Value:    resp.Token,
		HTTPOnly: true,
		Secure:   isSecureCookie(),
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   authCookieExpirySeconds(),
	})

	return c.JSON(resp)
}

func (h *TenantAuthHandler) Me(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || strings.TrimSpace(userID) == "" {
		return helpers.Fail(c, fiber.StatusUnauthorized, fiber.NewError(fiber.StatusUnauthorized, "missing user in context"))
	}

	tenant, err := h.svc.GetTenantByID(userID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusUnauthorized, err)
	}

	return c.JSON(fiber.Map{"tenant": tenant})
}

func (h *TenantAuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     authCookieName,
		Value:    "",
		HTTPOnly: true,
		Secure:   isSecureCookie(),
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   -1,
	})

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TenantHandler) Restore(c *fiber.Ctx) error {
	id, err := helpers.ParseStringID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Restore(id); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
