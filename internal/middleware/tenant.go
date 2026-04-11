package middleware

import (
	"context"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"multitenancypfe/internal/database"
)

func TenantDB() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant not identified"})
		}

		var tenantID string
		var userRole string

		// Check for X-Store-Id header (new multi-tenant flow)
		storeIDHeader := strings.TrimSpace(c.Get("X-Store-Id"))

		if storeIDHeader != "" {
			// NEW PATH: Cross-tenant access via store membership
			storeID, err := uuid.Parse(storeIDHeader)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "invalid X-Store-Id header format",
				})
			}

			// Query store_members table to verify access and get tenant_id
			var membership struct {
				TenantID string
				Role     string
			}

			err = database.DB.Raw(`
				SELECT tenant_id, role 
				FROM public.store_members 
				WHERE store_id = ? AND user_id = ? AND deleted_at IS NULL
			`, storeID, userID).Scan(&membership).Error

			if err != nil || membership.TenantID == "" {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "you don't have access to this store",
					"code":  "FORBIDDEN_STORE_ACCESS",
				})
			}

			tenantID = membership.TenantID
			userRole = membership.Role

			// Store metadata for later use
			c.Locals("storeID", storeID.String())
			c.Locals("userRole", userRole)
		} else {
			// OLD PATH: Direct user-to-schema mapping (backward compatibility).
			// Allow if the user owns at least one store OR already has a provisioned
			// tenant schema (e.g. a brand-new merchant who upgraded but hasn't
			// created a store yet).
			var schemaCount int64
			database.DB.Raw(
				`SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?`,
				fmt.Sprintf("tenant_%s", userID),
			).Scan(&schemaCount)
			if schemaCount == 0 {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "X-Store-Id header is required",
					"code":  "STORE_ID_REQUIRED",
				})
			}
			tenantID = userID
			userRole = "owner"
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
