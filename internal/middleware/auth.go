package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/database"
	"multitenancypfe/internal/jwt"
	storeModels "multitenancypfe/internal/store/models"
)

const authCookieName = "auth_token"

// RequireAuth validates the caller's identity.
// 1. Try Better Auth session cookie (for merchants using the dashboard).
// 2. Fall back to legacy JWT (auth_token cookie or Authorization header).
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// ── 1. Better Auth session ──────────────────────────────────
		sessionToken := strings.TrimSpace(c.Cookies("better-auth.session_token"))
		if sessionToken != "" {
			userID, role, err := validateBetterAuthSession(sessionToken)
			if err == nil && userID != "" {
				c.Locals("userID", userID)
				c.Locals("role", role)
				return c.Next()
			}
		}

		// ── 2. Better Auth session via Authorization: Bearer header ──
		bearerToken := ""
		if authHeader := c.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
			bearerToken = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		}
		if bearerToken != "" {
			userID, role, err := validateBetterAuthSession(bearerToken)
			if err == nil && userID != "" {
				c.Locals("userID", userID)
				c.Locals("role", role)
				return c.Next()
			}
		}

		// ── 3. Legacy JWT (cookie or Bearer) ──────────────────────
		token := strings.TrimSpace(c.Cookies(authCookieName))
		if token == "" {
			token = bearerToken
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing token"})
		}

		claims, err := jwt.Parse(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
		}

		c.Locals("userID", claims.UserID)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// validateBetterAuthSession queries the Better Auth "session" table in the
// public schema to check that the token is valid and not expired.
// Returns the user ID and role on success.
func validateBetterAuthSession(token string) (string, string, error) {
	var result struct {
		UserID    string    `gorm:"column:userId"`
		Role      *string   `gorm:"column:role"`
		ExpiresAt time.Time `gorm:"column:expiresAt"`
	}

	err := database.DB.Raw(
		`SELECT s."userId", s."expiresAt", u."role"
		 FROM public.session s
		 JOIN public."user" u ON u.id = s."userId"
		 WHERE s.token = ?
		 LIMIT 1`,
		token,
	).Scan(&result).Error

	if err != nil || result.UserID == "" {
		return "", "", err
	}
	if result.ExpiresAt.Before(time.Now()) {
		return "", "", nil
	}

	role := "staff"
	if result.Role != nil && strings.TrimSpace(*result.Role) != "" {
		role = *result.Role
	}

	return result.UserID, role, nil
}

// getBetterAuthSessionToken extracts the Better Auth session token from
// the request cookie or Authorization Bearer header.
func getBetterAuthSessionToken(c *fiber.Ctx) string {
	if t := strings.TrimSpace(c.Cookies("better-auth.session_token")); t != "" {
		return t
	}
	if authHeader := c.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	return ""
}

// RequireCustomerBetterAuth validates the Better Auth session cookie/Bearer
// and ensures the user is a customer belonging to the current store.
// It expects StoreContextMiddleware to have set sfStore in locals.
func RequireCustomerBetterAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := getBetterAuthSessionToken(c)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "not authenticated"})
		}

		userID, _, err := validateBetterAuthSession(token)
		if err != nil || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid session"})
		}

		// Fetch user role and storeId from public.user
		var user struct {
			Role    *string `gorm:"column:role"`
			StoreID *string `gorm:"column:storeId"`
		}
		if err := database.DB.Raw(
			`SELECT "role", "storeId" FROM public."user" WHERE id = ? LIMIT 1`, userID,
		).Scan(&user).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
		}

		if user.Role == nil || *user.Role != "customer" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not a customer"})
		}

		// Validate that this customer belongs to the current store.
		store, _ := c.Locals("sfStore").(*storeModels.Store)
		if store == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "store context missing"})
		}
		if user.StoreID == nil || *user.StoreID != store.ID.String() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not authorized for this store"})
		}

		c.Locals("customerID", userID)
		return c.Next()
	}
}

func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		if !allowed[role] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}
		return c.Next()
	}
}
