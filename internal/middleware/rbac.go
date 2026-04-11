package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/database"
	membershipModels "multitenancypfe/internal/membership/models"
)

// RequirePermission returns a middleware that checks whether the authenticated
// member has the given permission for the store identified by :storeId.
//
// It re-uses the member record (with its associated StoreRole) that was already
// fetched by TenantDB when an X-Store-Id header was provided. When no
// X-Store-Id is present (legacy owner path) all permissions are granted.
//
// Usage:
//
//	g.Post("/products", middleware.RequirePermission(models.PermProductsCreate), handler.Create)
func RequirePermission(permission string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Legacy owner path: no store header → full access (backward compat)
		storeIDHeader := c.Get("X-Store-Id")
		if storeIDHeader == "" {
			return c.Next()
		}

		userID, _ := c.Locals("userID").(string)
		if userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "not authenticated"})
		}

		storeID, err := uuid.Parse(storeIDHeader)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid X-Store-Id"})
		}

		// Load member with custom role preloaded
		var member membershipModels.StoreMember
		err = database.DB.
			Preload("StoreRole").
			Where("store_id = ? AND user_id = ? AND deleted_at IS NULL", storeID, userID).
			First(&member).Error
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "you don't have access to this store",
				"code":  "FORBIDDEN_STORE_ACCESS",
			})
		}

		if !member.HasPermission(permission) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":      "you don't have permission to perform this action",
				"code":       "FORBIDDEN_PERMISSION",
				"permission": permission,
			})
		}

		return c.Next()
	}
}

// RequireAnyPermission allows access if the member has AT LEAST ONE of the given permissions.
func RequireAnyPermission(permissions ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeIDHeader := c.Get("X-Store-Id")
		if storeIDHeader == "" {
			return c.Next()
		}

		userID, _ := c.Locals("userID").(string)
		if userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "not authenticated"})
		}

		storeID, err := uuid.Parse(storeIDHeader)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid X-Store-Id"})
		}

		var member membershipModels.StoreMember
		err = database.DB.
			Preload("StoreRole").
			Where("store_id = ? AND user_id = ? AND deleted_at IS NULL", storeID, userID).
			First(&member).Error
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "you don't have access to this store",
				"code":  "FORBIDDEN_STORE_ACCESS",
			})
		}

		for _, p := range permissions {
			if member.HasPermission(p) {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't have permission to perform this action",
			"code":  "FORBIDDEN_PERMISSION",
		})
	}
}
