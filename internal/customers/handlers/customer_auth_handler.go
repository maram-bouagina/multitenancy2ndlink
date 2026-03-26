package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	"multitenancypfe/internal/customers/services"
	storeModels "multitenancypfe/internal/store/models"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type CustomerAuthHandler struct {
	authSvc *services.CustomerAuthService
}

func NewCustomerAuthHandler(authSvc *services.CustomerAuthService) *CustomerAuthHandler {
	return &CustomerAuthHandler{authSvc: authSvc}
}

func getDB(c *fiber.Ctx) *gorm.DB {
	db, _ := c.Locals("sfDB").(*gorm.DB)
	return db
}

func getStore(c *fiber.Ctx) *storeModels.Store {
	s, _ := c.Locals("sfStore").(*storeModels.Store)
	return s
}

func toCustomerResponse(m *models.Customer) dto.CustomerResponse {
	return dto.CustomerResponse{
		ID:               m.ID,
		Email:            m.Email,
		FirstName:        m.FirstName,
		LastName:         m.LastName,
		Phone:            m.Phone,
		Avatar:           m.Avatar,
		Status:           m.Status,
		EmailVerified:    m.EmailVerified,
		TwoFactorEnabled: m.TwoFactorEnabled,
		AcceptsMarketing: m.AcceptsMarketing,
		CreatedAt:        m.CreatedAt.Format(time.RFC3339),
	}
}

// POST /api/public/stores/:slug/auth/register
func (h *CustomerAuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := getDB(c)
	store := getStore(c)

	customer, verifyToken, err := h.authSvc.Register(db, store.ID, req)
	if err != nil {
		if err.Error() == "email already registered" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "registration failed"})
	}

	resp := toCustomerResponse(customer)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "Registration successful. Please verify your email.",
		"verify_token": verifyToken,
		"customer":     resp,
	})
}

// POST /api/public/stores/:slug/auth/login
func (h *CustomerAuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := getDB(c)
	store := getStore(c)

	customer, token, err := h.authSvc.Login(db, store.ID, req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	if !customer.EmailVerified {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":          "email not verified",
			"email_verified": false,
		})
	}

	// Set HTTP-only cookie
	c.Cookie(&fiber.Cookie{
		Name:     "customer_token",
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		Secure:   false, // set true in production
		SameSite: "Lax",
		MaxAge:   86400, // 24h
	})

	resp := toCustomerResponse(customer)
	return c.JSON(fiber.Map{
		"customer": resp,
		"token":    token,
	})
}

// POST /api/public/stores/:slug/auth/verify-email
func (h *CustomerAuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var req dto.VerifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := getDB(c)
	if err := h.authSvc.VerifyEmail(db, req.Token); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Email verified successfully"})
}

// POST /api/public/stores/:slug/auth/forgot-password
func (h *CustomerAuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req dto.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := getDB(c)
	store := getStore(c)

	// Always return success to prevent email enumeration
	_, _ = h.authSvc.ForgotPassword(db, store.ID, req.Email)

	return c.JSON(fiber.Map{"message": "If an account exists, a reset link has been sent."})
}

// POST /api/public/stores/:slug/auth/reset-password
func (h *CustomerAuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req dto.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := getDB(c)
	if err := h.authSvc.ResetPassword(db, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Password reset successfully"})
}

// POST /api/public/stores/:slug/auth/logout
func (h *CustomerAuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "customer_token",
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		MaxAge:   -1,
	})
	return c.JSON(fiber.Map{"message": "Logged out"})
}
