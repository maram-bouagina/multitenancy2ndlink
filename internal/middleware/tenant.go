package middleware

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/database"
)

func TenantDB() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID, ok := c.Locals("userID").(string)
		if !ok || tenantID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant not identified"})
		}

		schema := fmt.Sprintf("tenant_%s", tenantID)

		if err := database.EnsureTenantSchemaUpToDate(tenantID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "tenant schema migration failed: " + err.Error()})
		}

		// Get a new GORM session from the global database
		// Each request gets its own scoped DB session
		scopedDB := database.DB.Session(&gorm.Session{})

		// Set search_path for this connection to prioritize tenant schema
		// Schema names with special characters must be quoted
		if err := scopedDB.Exec(fmt.Sprintf(`SET search_path = "%s", public`, schema)).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "set search_path failed: " + err.Error()})
		}

		c.Locals("tenantDB", scopedDB)
		c.Locals("tenantID", tenantID)
		c.Locals("schema", schema)

		return c.Next()
	}
}

func GetTenantDB(c *fiber.Ctx) *gorm.DB {
	db, _ := c.Locals("tenantDB").(*gorm.DB)
	return db
}
