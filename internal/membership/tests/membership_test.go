package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"multitenancypfe/internal/database"
	"multitenancypfe/internal/membership/dto"
	"multitenancypfe/internal/membership/handlers"
	"multitenancypfe/internal/membership/repo"
	"multitenancypfe/internal/membership/services"
)

// TestMembershipFlow tests the complete invitation and membership flow
func TestMembershipFlow(t *testing.T) {
	// Setup
	app := setupTestApp()

	// Test data
	ownerID := "owner-user-123"
	designerID := "designer-user-456"
	designerEmail := "designer@example.com"
	storeID := uuid.New()

	// Create test store and owner membership
	setupTestStore(t, storeID, ownerID)

	// Test 1: Owner creates invitation
	t.Run("Owner creates invitation", func(t *testing.T) {
		reqBody := dto.CreateInvitationRequest{
			Email: designerEmail,
			Role:  "designer",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", fmt.Sprintf("/api/stores/%s/invitations", storeID), bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		applyTestAuthHeaders(req, ownerID, ownerID)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)
		assert.Contains(t, response, "invitation")
	})

	// Test 2: Get invitations list
	t.Run("Get store invitations", func(t *testing.T) {
		req := httptest.NewRequest("GET", fmt.Sprintf("/api/stores/%s/invitations", storeID), nil)
		applyTestAuthHeaders(req, ownerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)
		assert.Contains(t, response, "invitations")
	})

	// Test 3: Designer accepts invitation
	t.Run("Designer accepts invitation", func(t *testing.T) {
		// Get invitation token from database
		var invitation struct{ Token string }
		database.DB.Raw("SELECT token FROM store_invitations WHERE email = ? AND status = 'pending' LIMIT 1", designerEmail).Scan(&invitation)

		req := httptest.NewRequest("POST", fmt.Sprintf("/api/invitations/%s/accept", invitation.Token), nil)
		applyTestAuthHeaders(req, designerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	// Test 4: Verify designer can access store
	t.Run("Designer can access store", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/user/stores", nil)
		applyTestAuthHeaders(req, designerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var response dto.MyStoresResponse
		json.NewDecoder(resp.Body).Decode(&response)
		assert.Len(t, response.Stores, 1)
		assert.Equal(t, "designer", response.Stores[0].Role)
	})

	// Test 5: Designer cannot access without X-Store-Id
	t.Run("Access requires X-Store-Id header", func(t *testing.T) {
		t.Skip("this belongs to TenantDB middleware integration coverage, not the membership handler routes in this test app")
	})

	// Test 6: Designer can access with correct X-Store-Id
	t.Run("Access works with X-Store-Id header", func(t *testing.T) {
		req := httptest.NewRequest("GET", fmt.Sprintf("/api/stores/%s/members", storeID), nil)
		req.Header.Set("X-Store-Id", storeID.String())
		applyTestAuthHeaders(req, designerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	// Test 7: Cannot accept invitation twice
	t.Run("Cannot accept invitation twice", func(t *testing.T) {
		var invitation struct{ Token string }
		database.DB.Raw("SELECT token FROM store_invitations WHERE email = ? LIMIT 1", designerEmail).Scan(&invitation)

		req := httptest.NewRequest("POST", fmt.Sprintf("/api/invitations/%s/accept", invitation.Token), nil)
		applyTestAuthHeaders(req, designerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	// Test 8: Owner can update member role
	t.Run("Owner updates member role", func(t *testing.T) {
		// Get member ID
		var memberID uuid.UUID
		database.DB.Raw("SELECT id FROM store_members WHERE user_id = ? AND store_id = ?", designerID, storeID).Scan(&memberID)

		reqBody := dto.UpdateMemberRoleRequest{Role: "editor"}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("PATCH", fmt.Sprintf("/api/stores/%s/members/%s/role", storeID, memberID), bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Store-Id", storeID.String())
		applyTestAuthHeaders(req, ownerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	// Test 9: Owner can remove member
	t.Run("Owner removes member", func(t *testing.T) {
		var memberID uuid.UUID
		database.DB.Raw("SELECT id FROM store_members WHERE user_id = ? AND store_id = ?", designerID, storeID).Scan(&memberID)

		req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/stores/%s/members/%s", storeID, memberID), nil)
		req.Header.Set("X-Store-Id", storeID.String())
		applyTestAuthHeaders(req, ownerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	// Test 10: Designer loses access after removal
	t.Run("Removed member cannot access store", func(t *testing.T) {
		req := httptest.NewRequest("GET", fmt.Sprintf("/api/stores/%s/members", storeID), nil)
		req.Header.Set("X-Store-Id", storeID.String())
		applyTestAuthHeaders(req, designerID, "")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}

// TestInvitationExpiry tests invitation expiration
func TestInvitationExpiry(t *testing.T) {
	// TODO: Test that expired invitations cannot be accepted
}

// TestEmailMismatch tests email verification
func TestEmailMismatch(t *testing.T) {
	// TODO: Test that invitation with different email is rejected
}

// TestRaceCondition tests concurrent invitation acceptance
func TestRaceCondition(t *testing.T) {
	// TODO: Test that double-clicking accept doesn't create duplicate memberships
}

// Helper functions

func setupTestApp() *fiber.App {
	app := fiber.New()

	membershipRepo := repo.NewMembershipRepository()
	membershipService := services.NewMembershipService(membershipRepo)
	handler := handlers.NewMembershipHandler(membershipService)

	app.Use(func(c *fiber.Ctx) error {
		userID := c.Get("X-Test-User-Id")
		if userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing test user"})
		}

		c.Locals("userID", userID)
		if tenantID := c.Get("X-Test-Tenant-Id"); tenantID != "" {
			c.Locals("tenantID", tenantID)
		}

		return c.Next()
	})

	app.Get("/api/user/stores", handler.GetMyStores)
	app.Post("/api/invitations/:token/accept", handler.AcceptInvitation)
	app.Post("/api/stores/:storeId/invitations", handler.CreateInvitation)
	app.Get("/api/stores/:storeId/invitations", handler.GetStoreInvitations)
	app.Get("/api/stores/:storeId/members", handler.GetStoreMembers)
	app.Patch("/api/stores/:storeId/members/:memberId/role", handler.UpdateMemberRole)
	app.Delete("/api/stores/:storeId/members/:memberId", handler.RemoveMember)

	return app
}

func applyTestAuthHeaders(req *http.Request, userID string, tenantID string) {
	req.Header.Set("X-Test-User-Id", userID)
	if tenantID != "" {
		req.Header.Set("X-Test-Tenant-Id", tenantID)
	}
}

func setupTestStore(t *testing.T, storeID uuid.UUID, ownerID string) {
	t.Helper()
	if database.DB == nil {
		t.Skip("database.DB is not initialized for membership integration tests")
	}

	// Create test store in owner's schema
	schema := fmt.Sprintf("tenant_%s", ownerID)
	database.DB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", schema))

	// Insert store
	query := fmt.Sprintf(`
		INSERT INTO %s.stores (id, tenant_id, name, slug, currency, status)
		VALUES (?, ?, 'Test Store', 'test-store', 'EUR', 'active')
	`, schema)
	database.DB.Exec(query, storeID, ownerID)

	// Create owner membership
	database.DB.Exec(`
		INSERT INTO public.store_members (store_id, user_id, tenant_id, role)
		VALUES (?, ?, ?, 'owner')
	`, storeID, ownerID, ownerID)

	// Create test user in Better Auth
	database.DB.Exec(`
		INSERT INTO public.user (id, name, email, "emailVerified")
		VALUES (?, 'Designer User', 'designer@example.com', true)
		ON CONFLICT (id) DO NOTHING
	`, "designer-user-456")
}
