package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// RequireOwnerContext restricts an endpoint to the tenant owner context.
// Requests routed through a staff store context (X-Store-Id header) are only
// allowed when the membership role is owner.
func RequireOwnerContext() fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeIDHeader := strings.TrimSpace(c.Get("X-Store-Id"))
		if storeIDHeader == "" {
			return c.Next()
		}

		userRole, _ := c.Locals("userRole").(string)
		if userRole != "owner" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "only owners can access this resource",
				"code":  "FORBIDDEN_OWNER_CONTEXT",
			})
		}

		return c.Next()
	}
}

// EnsureStoreContextMatches prevents staff users from sending an X-Store-Id for
// one store while targeting another store ID in the route path.
func EnsureStoreContextMatches(paramName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeIDHeader := strings.TrimSpace(c.Get("X-Store-Id"))
		if storeIDHeader == "" {
			return c.Next()
		}

		routeStoreID := strings.TrimSpace(c.Params(paramName))
		if routeStoreID == "" {
			return c.Next()
		}

		if routeStoreID != storeIDHeader {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "you don't have access to this store",
				"code":  "FORBIDDEN_STORE_ACCESS",
			})
		}

		return c.Next()
	}
}
