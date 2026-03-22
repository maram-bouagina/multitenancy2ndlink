package helpers

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var validate = validator.New()

// parseID extracts and validates a UUID from the route param ":id"
func ParseID(c *fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		_ = c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	return id, err
}

// parseUserID extracts the user ID from the context locals
func ParseUserID(c *fiber.Ctx) (uuid.UUID, error) {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not authenticated"})
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "user not authenticated")
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid user id"})
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "invalid user id")
	}
	return id, nil
}

// getTenantDB extracts the tenant DB from the context locals
func GetTenantDB(c *fiber.Ctx) *gorm.DB {
	db, _ := c.Locals("tenantDB").(*gorm.DB)
	return db
}

// parseBody decodes the request body into dst and writes a 400 on failure
func ParseBody(c *fiber.Ctx, dst any) error {
	if err := c.BodyParser(dst); err != nil {
		c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if err := validate.Struct(dst); err != nil {
		c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
		return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
	}
	return nil
}

// fail writes a JSON error response
func Fail(c *fiber.Ctx, status int, err error) error {
	return c.Status(status).JSON(fiber.Map{"error": err.Error()})
}
