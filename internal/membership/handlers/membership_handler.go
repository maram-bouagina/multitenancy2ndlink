package handlers

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	authModels "multitenancypfe/internal/auth/models"
	"multitenancypfe/internal/database"
	"multitenancypfe/internal/membership/dto"
	"multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/membership/services"
)

type MembershipHandler struct {
	service services.MembershipService
}

// resolveAccess returns the current user's StoreMember for the given store.
// When the request is using the legacy direct-owner path (no X-Store-Id header)
// TenantDB already authenticated the user as the tenant owner, so we return a
// synthetic owner member without hitting the DB. Otherwise we do a real lookup.
func (h *MembershipHandler) resolveAccess(c *fiber.Ctx, storeID uuid.UUID) (*models.StoreMember, error) {
	userID := c.Locals("userID").(string)
	if strings.TrimSpace(c.Get("X-Store-Id")) == "" {
		return &models.StoreMember{StoreID: storeID, UserID: userID, Role: "owner"}, nil
	}
	return h.service.VerifyStoreAccess(storeID, userID)
}

// isDirectOwner returns true when TenantDB used the legacy direct-owner path.
func isDirectOwner(c *fiber.Ctx) bool {
	return strings.TrimSpace(c.Get("X-Store-Id")) == ""
}

func NewMembershipHandler(service services.MembershipService) *MembershipHandler {
	return &MembershipHandler{service: service}
}

// GetAccountContext returns the authoritative account mode for the current user.
// GET /api/user/account-context
func (h *MembershipHandler) GetAccountContext(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var user database.BetterAuthUser
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	role := "staff"
	if user.Role != nil && strings.TrimSpace(*user.Role) != "" {
		role = strings.TrimSpace(*user.Role)
	}

	// Only trust the schema as proof of actual upgrade — public.tenants can have
	// stale rows for accounts created when the default role was "merchant" (old
	// default). The tenant schema is ONLY created by UpgradeToMerchant.
	var schemaCount int64
	database.DB.Raw(
		`SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?`,
		fmt.Sprintf("tenant_%s", userID),
	).Scan(&schemaCount)

	var ownerMembershipCount int64
	database.DB.Raw(
		`SELECT COUNT(*) FROM public.store_members WHERE user_id = ? AND role = 'owner' AND deleted_at IS NULL`,
		userID,
	).Scan(&ownerMembershipCount)

	hasTenantWorkspace := schemaCount > 0
	hasOwnedStoreAccess := ownerMembershipCount > 0

	return c.JSON(fiber.Map{
		"role":                   role,
		"has_tenant_workspace":   hasTenantWorkspace,
		"has_owned_store_access": hasOwnedStoreAccess,
	})
}

// GetStoreRoles lists all custom roles for a store
// GET /api/stores/:storeId/roles
func (h *MembershipHandler) GetStoreRoles(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	userID := c.Locals("userID").(string)
	if _, err = h.resolveAccess(c, storeID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	_ = userID
	roles, err := h.service.GetStoreRoles(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"roles": roles})
}

// CreateRole creates a new custom role for a store
// POST /api/stores/:storeId/roles
func (h *MembershipHandler) CreateRole(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	userID := c.Locals("userID").(string)
	var req dto.CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	role, err := h.service.CreateRole(storeID, userID, isDirectOwner(c), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"role": fiber.Map{
		"id": role.ID, "name": role.Name, "description": role.Description,
		"permissions": role.Permissions, "is_system": role.IsSystem, "created_at": role.CreatedAt,
	}})
}

// UpdateRole updates a custom role
// PUT /api/stores/:storeId/roles/:roleId
func (h *MembershipHandler) UpdateRole(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	roleID, err := uuid.Parse(c.Params("roleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid role ID"})
	}
	userID := c.Locals("userID").(string)
	var req dto.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.service.UpdateRole(roleID, userID, isDirectOwner(c), storeID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "role updated successfully"})
}

// DeleteRole deletes a custom role
// DELETE /api/stores/:storeId/roles/:roleId
func (h *MembershipHandler) DeleteRole(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	roleID, err := uuid.Parse(c.Params("roleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid role ID"})
	}
	userID := c.Locals("userID").(string)
	if err := h.service.DeleteRole(roleID, userID, isDirectOwner(c), storeID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "role deleted successfully"})
}

// GetAllPermissions returns all available permission keys
// GET /api/permissions
func (h *MembershipHandler) GetAllPermissions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"permissions": h.service.GetAllPermissions()})
}

// CreateInvitation invites a new member to a store
// POST /api/stores/:storeId/invitations
func (h *MembershipHandler) CreateInvitation(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	userID := c.Locals("userID").(string)
	tenantID, ok := c.Locals("tenantID").(string)
	if !ok || tenantID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant context missing"})
	}
	var req dto.CreateInvitationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	member, err := h.resolveAccess(c, storeID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	if !member.HasPermission("team:manage") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't have permission to invite members", "code": "FORBIDDEN_PERMISSION",
		})
	}
	invitation, err := h.service.CreateInvitation(storeID, tenantID, userID, req)
	if err != nil {
		if errors.Is(err, services.ErrAlreadyMember) || errors.Is(err, services.ErrAlreadyInvited) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "invitation created successfully",
		"invitation": fiber.Map{
			"id": invitation.ID, "email": invitation.Email,
			"role": invitation.Role, "store_role_id": invitation.StoreRoleID,
		},
	})
}

// GetInvitationPreview returns public (unauthenticated) details about an invitation.
// GET /api/invitations/:token
func (h *MembershipHandler) GetInvitationPreview(c *fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing invitation token"})
	}
	preview, err := h.service.GetInvitationPreview(token)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(preview)
}

// VerifyEmailViaInvitation marks the invited email as verified.
// The invitation token itself proves the user owns the email address.
// POST /api/invitations/:token/verify-email (public — no auth)
func (h *MembershipHandler) VerifyEmailViaInvitation(c *fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing token"})
	}
	inv, err := h.service.GetInvitationPreview(token)
	if err != nil || inv == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "invitation not found"})
	}
	// Only allow for pending invitations (not already accepted/revoked)
	if inv.Status != "pending" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invitation is no longer pending"})
	}
	result := database.DB.Model(&database.BetterAuthUser{}).
		Where("email = ?", inv.Email).
		Update("emailVerified", true)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not verify email"})
	}
	return c.JSON(fiber.Map{"message": "email verified"})
}

// AcceptInvitation accepts an invitation
// POST /api/invitations/:token/accept
func (h *MembershipHandler) AcceptInvitation(c *fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing invitation token"})
	}
	userID := c.Locals("userID").(string)
	var user database.BetterAuthUser
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
	}
	var body dto.AcceptInvitationRequest
	_ = c.BodyParser(&body) // optional body — no error if empty
	storeID, err := h.service.AcceptInvitation(token, userID, user.Email, body.DisplayName, body.Phone, body.Bio)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "invitation accepted successfully", "store_id": storeID})
}

// GetStoreInvitations lists all invitations for a store
// GET /api/stores/:storeId/invitations
func (h *MembershipHandler) GetStoreInvitations(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	if _, err := h.resolveAccess(c, storeID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	invitations, err := h.service.GetStoreInvitations(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"invitations": invitations})
}

// RevokeInvitation revokes a pending invitation
// DELETE /api/invitations/:invitationId
func (h *MembershipHandler) RevokeInvitation(c *fiber.Ctx) error {
	invitationID, err := uuid.Parse(c.Params("invitationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid invitation ID"})
	}
	if err := h.service.RevokeInvitation(invitationID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "invitation revoked successfully"})
}

// GetStoreMembers lists all members of a store
// GET /api/stores/:storeId/members
func (h *MembershipHandler) GetStoreMembers(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	_, err = h.resolveAccess(c, storeID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	members, err := h.service.GetStoreMembers(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	// Self-heal: if using the direct-owner path and the owner row is missing, create it now.
	if isDirectOwner(c) {
		ownerID := c.Locals("userID").(string)
		found := false
		for _, m := range members {
			if m.UserID == ownerID {
				found = true
				break
			}
		}
		if !found {
			ownerRow := models.StoreMember{
				StoreID:  storeID,
				UserID:   ownerID,
				TenantID: ownerID,
				Role:     "owner",
			}
			database.DB.Create(&ownerRow)
			// Re-fetch so the response includes the new row with its generated ID / timestamps.
			if fresh, err2 := h.service.GetStoreMembers(storeID); err2 == nil {
				members = fresh
			}
		}
	}
	for i := range members {
		var user database.BetterAuthUser
		if err := database.DB.Where("id = ?", members[i].UserID).First(&user).Error; err == nil {
			members[i].Email = user.Email
			members[i].Name = user.Name
		}
	}
	return c.JSON(fiber.Map{"members": members})
}

// UpdateMemberRole updates a member's role and/or custom role assignment
// PATCH /api/stores/:storeId/members/:memberId/role
func (h *MembershipHandler) UpdateMemberRole(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	memberID, err := uuid.Parse(c.Params("memberId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid member ID"})
	}
	userID := c.Locals("userID").(string)
	var req dto.UpdateMemberRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.service.UpdateMemberRole(memberID, storeID, userID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "member role updated successfully"})
}

// RemoveMember removes a member from a store
// DELETE /api/stores/:storeId/members/:memberId
func (h *MembershipHandler) RemoveMember(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store ID"})
	}
	memberID, err := uuid.Parse(c.Params("memberId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid member ID"})
	}
	member, err := h.resolveAccess(c, storeID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	if member.Role != "owner" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "only owners can remove members"})
	}
	if err := h.service.RemoveMember(memberID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "member removed successfully"})
}

// GetMyStores returns all stores the authenticated user has access to
// GET /api/user/stores
func (h *MembershipHandler) GetMyStores(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	stores, err := h.service.GetMyStores(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stores)
}

// VerifyStoreAccessMiddleware middleware-like handler to verify store access
func (h *MembershipHandler) VerifyStoreAccessMiddleware(c *fiber.Ctx) error {
	storeIDHeader := strings.TrimSpace(c.Get("X-Store-Id"))
	if storeIDHeader == "" {
		return c.Next()
	}
	storeID, err := uuid.Parse(storeIDHeader)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid X-Store-Id header"})
	}
	userID := c.Locals("userID").(string)
	_, err = h.service.VerifyStoreAccess(storeID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't have access to this store", "code": "FORBIDDEN_STORE_ACCESS",
		})
	}
	return c.Next()
}

// UpgradeToMerchant promotes the current staff user to the merchant role and
// provisions their tenant schema so they can create stores.
// POST /api/user/upgrade
func (h *MembershipHandler) UpgradeToMerchant(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var user database.BetterAuthUser
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	merchantRole := "merchant"
	if user.Role == nil || *user.Role != merchantRole {
		if err := database.DB.Model(&user).Update("role", merchantRole).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to upgrade role"})
		}
	}

	tenant := authModels.Tenant{
		ID:            user.ID,
		Email:         user.Email,
		PasswordHash:  "better-auth-managed",
		FirstName:     strings.TrimSpace(valueOrEmpty(user.FirstName)),
		LastName:      strings.TrimSpace(valueOrEmpty(user.LastName)),
		Phone:         user.Phone,
		Plan:          strings.TrimSpace(valueOrDefault(user.Plan, "free")),
		Status:        strings.TrimSpace(valueOrDefault(user.UserStatus, "active")),
		EmailVerified: user.EmailVerified,
	}
	if tenant.FirstName == "" {
		tenant.FirstName = firstWord(user.Name)
	}
	if tenant.LastName == "" {
		tenant.LastName = remainingWords(user.Name)
	}
	if tenant.FirstName == "" {
		tenant.FirstName = "User"
	}
	if tenant.LastName == "" {
		tenant.LastName = "Account"
	}

	if err := database.DB.Where("id = ?", tenant.ID).FirstOrCreate(&tenant).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to upgrade role"})
	}

	if err := database.CreateTenantSchema(userID); err != nil {
		// Rollback role
		database.DB.Model(&user).Update("role", "staff")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to provision tenant schema"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "upgraded to merchant successfully"})
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func valueOrDefault(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return *value
}

func firstWord(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return ""
	}
	return parts[0]
}

func remainingWords(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) <= 1 {
		return ""
	}
	return strings.Join(parts[1:], " ")
}

// DeleteOwnAccount permanently removes all platform data for the current user.
// ⚠ TEMPORARY – for development/testing only. Remove before production.
// DELETE /api/user/account
func (h *MembershipHandler) DeleteOwnAccount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// 1. Drop tenant schema (cascade-deletes all stores, products, etc.)
	schemaName := fmt.Sprintf("tenant_%s", userID)
	database.DB.Exec(fmt.Sprintf(`DROP SCHEMA IF EXISTS "%s" CASCADE`, schemaName))

	// 2. Remove tenant record
	database.DB.Exec(`DELETE FROM public.tenants WHERE id = ?`, userID)

	// 3. Remove all store memberships
	database.DB.Exec(`DELETE FROM public.store_members WHERE user_id = ?`, userID)

	// 4. Invalidate all sessions (force sign-out everywhere)
	database.DB.Exec(`DELETE FROM public.session WHERE "userId" = ?`, userID)

	// 5. Remove linked accounts (OAuth providers)
	database.DB.Exec(`DELETE FROM public.account WHERE "userId" = ?`, userID)

	// 6. Delete the Better Auth user row last
	database.DB.Exec(`DELETE FROM public.user WHERE id = ?`, userID)

	return c.JSON(fiber.Map{"message": "account deleted"})
}
