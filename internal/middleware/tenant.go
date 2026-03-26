package middleware

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
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

		// Pin a single connection from the pool so that SET search_path
		// applies to ALL queries in the request (including Preloads),
		// without wrapping everything in a transaction — individual row
		// failures (e.g. during import) won't poison subsequent queries.
		sqlDB, err := database.DB.DB()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "get sql.DB failed"})
		}

		conn, err := sqlDB.Conn(context.Background())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "acquire connection failed"})
		}
		defer conn.Close()

		if _, err := conn.ExecContext(context.Background(),
			fmt.Sprintf("SET search_path TO %q, public", schema),
		); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "set search_path failed"})
		}

		scopedDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{})
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "open scoped db failed"})
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
