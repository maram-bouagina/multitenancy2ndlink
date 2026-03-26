package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/services"
)

type CustomerProfileHandler struct {
	profileSvc *services.CustomerProfileService
}

func NewCustomerProfileHandler(profileSvc *services.CustomerProfileService) *CustomerProfileHandler {
	return &CustomerProfileHandler{profileSvc: profileSvc}
}

func getCustomerID(c *fiber.Ctx) (string, error) {
	idStr, ok := c.Locals("customerID").(string)
	if !ok || idStr == "" {
		return "", errors.New("missing customer ID")
	}
	return idStr, nil
}

// GET /api/public/stores/:slug/account/me
func (h *CustomerProfileHandler) GetProfile(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	db := getDB(c)
	customer, err := h.profileSvc.GetProfile(db, customerID)
	if err != nil || customer == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}

	return c.JSON(toCustomerResponse(customer))
}

// PUT /api/public/stores/:slug/account/profile
func (h *CustomerProfileHandler) UpdateProfile(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	var req dto.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := getDB(c)
	customer, err := h.profileSvc.UpdateProfile(db, customerID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	return c.JSON(toCustomerResponse(customer))
}

// ── Addresses ────────────────────────────────────────────────────────────────

// GET /api/public/stores/:slug/account/addresses
func (h *CustomerProfileHandler) ListAddresses(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	db := getDB(c)
	addrs, err := h.profileSvc.ListAddresses(db, customerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load addresses"})
	}

	return c.JSON(addrs)
}

// POST /api/public/stores/:slug/account/addresses
func (h *CustomerProfileHandler) CreateAddress(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	var req dto.CreateAddressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := getDB(c)
	store := getStore(c)
	addr, err := h.profileSvc.CreateAddress(db, customerID, store.ID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create address"})
	}

	return c.Status(fiber.StatusCreated).JSON(addr)
}

// PUT /api/public/stores/:slug/account/addresses/:id
func (h *CustomerProfileHandler) UpdateAddress(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	addrID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid address id"})
	}

	var req dto.UpdateAddressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := getDB(c)
	store := getStore(c)
	addr, err := h.profileSvc.UpdateAddress(db, addrID, customerID, store.ID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update address"})
	}

	return c.JSON(addr)
}

// DELETE /api/public/stores/:slug/account/addresses/:id
func (h *CustomerProfileHandler) DeleteAddress(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	addrID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid address id"})
	}

	db := getDB(c)
	if err := h.profileSvc.DeleteAddress(db, addrID, customerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete address"})
	}

	return c.JSON(fiber.Map{"message": "Address deleted"})
}

// ── Privacy ──────────────────────────────────────────────────────────────────

// PUT /api/public/stores/:slug/account/privacy
func (h *CustomerProfileHandler) UpdatePrivacy(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	var req dto.PrivacySettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := getDB(c)
	if err := h.profileSvc.UpdatePrivacy(db, customerID, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	return c.JSON(fiber.Map{"message": "Privacy settings updated"})
}

// DELETE /api/public/stores/:slug/account
func (h *CustomerProfileHandler) DeleteAccount(c *fiber.Ctx) error {
	customerID, err := getCustomerID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
	}

	db := getDB(c)
	if err := h.profileSvc.DeleteAccount(db, customerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "deletion failed"})
	}

	// Clear the Better Auth session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "better-auth.session_token",
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		MaxAge:   -1,
	})

	return c.JSON(fiber.Map{"message": "Account deleted"})
}
