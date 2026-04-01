package handlers

import (
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	storeModels "multitenancypfe/internal/store/models"
)

var validate = validator.New()

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
