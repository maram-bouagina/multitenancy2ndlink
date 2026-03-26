package handlers

import (
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"

	storeModels "multitenancypfe/internal/store/models"
)

type newsletterSubscribeRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
}

// POST /api/public/stores/:slug/newsletter/subscribe
func (h *Handler) NewsletterSubscribe(c *fiber.Ctx) error {
	var req newsletterSubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if _, err := mail.ParseAddress(email); err != nil || email == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "valid email is required"})
	}

	db := getSfDB(c)
	store := getSfStore(c)

	// Upsert: if already subscribed, just re-activate
	var existing storeModels.NewsletterSubscriber
	result := db.Where("store_id = ? AND email = ?", store.ID, email).First(&existing)
	if result.Error == nil {
		// Already exists
		if !existing.Active {
			db.Model(&existing).Updates(map[string]interface{}{"active": true, "first_name": strings.TrimSpace(req.FirstName)})
		} else if fn := strings.TrimSpace(req.FirstName); fn != "" && existing.FirstName == "" {
			db.Model(&existing).Update("first_name", fn)
		}
		return c.JSON(fiber.Map{"message": "Subscribed successfully"})
	}

	firstName := strings.TrimSpace(req.FirstName)
	sub := storeModels.NewsletterSubscriber{
		StoreID:   store.ID,
		Email:     email,
		FirstName: firstName,
		Active:    true,
	}
	if err := db.Create(&sub).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "subscription failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Subscribed successfully"})
}
