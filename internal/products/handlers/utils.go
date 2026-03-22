package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func parseStoreID(c *fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}
	return id, err
}
