package routes

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/membership/handlers"
	"multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/membership/repo"
	"multitenancypfe/internal/membership/services"
	"multitenancypfe/internal/middleware"
)

func RegisterMembershipRoutes(app *fiber.App) {
	membershipRepo := repo.NewMembershipRepository()
	membershipService := services.NewMembershipService(membershipRepo)
	handler := handlers.NewMembershipHandler(membershipService)

	// Global: all available permission keys (authenticated)
	app.Get("/api/permissions",
		middleware.RequireAuth(),
		handler.GetAllPermissions,
	)

	// User stores endpoint (get all stores user has access to)
	app.Get("/api/user/stores",
		middleware.RequireAuth(),
		handler.GetMyStores,
	)

	app.Get("/api/user/account-context",
		middleware.RequireAuth(),
		handler.GetAccountContext,
	)

	// Upgrade staff user to merchant role (provisions tenant schema)
	app.Post("/api/user/upgrade",
		middleware.RequireAuth(),
		handler.UpgradeToMerchant,
	)

	// ⚠ TEMPORARY: delete own account + all platform data (dev/testing only)
	app.Delete("/api/user/account",
		middleware.RequireAuth(),
		handler.DeleteOwnAccount,
	)

	// Public: invitation preview (no auth required — used by invite landing page)
	app.Get("/api/invitations/:token",
		handler.GetInvitationPreview,
	)

	// Public: verify email via invitation token (invitation link proves email ownership)
	app.Post("/api/invitations/:token/verify-email",
		handler.VerifyEmailViaInvitation,
	)

	// Invitation acceptance (requires auth but no store context)
	app.Post("/api/invitations/:token/accept",
		middleware.RequireAuth(),
		handler.AcceptInvitation,
	)

	// Revoke invitation
	app.Delete("/api/invitations/:invitationId",
		middleware.RequireAuth(),
		handler.RevokeInvitation,
	)

	// Store-specific membership routes (require auth + tenant context)
	storeGroup := app.Group("/api/stores/:storeId",
		middleware.RequireAuth(),
		middleware.TenantDB(),
		middleware.EnsureStoreContextMatches("storeId"),
	)

	// Custom roles
	storeGroup.Get("/roles", middleware.RequirePermission(models.PermTeamManage), handler.GetStoreRoles)
	storeGroup.Post("/roles", middleware.RequirePermission(models.PermTeamManage), handler.CreateRole)
	storeGroup.Put("/roles/:roleId", middleware.RequirePermission(models.PermTeamManage), handler.UpdateRole)
	storeGroup.Delete("/roles/:roleId", middleware.RequirePermission(models.PermTeamManage), handler.DeleteRole)

	// Invitations
	storeGroup.Post("/invitations", middleware.RequirePermission(models.PermTeamManage), handler.CreateInvitation)
	storeGroup.Get("/invitations", middleware.RequirePermission(models.PermTeamManage), handler.GetStoreInvitations)

	// Members
	storeGroup.Get("/members", middleware.RequirePermission(models.PermTeamManage), handler.GetStoreMembers)
	storeGroup.Patch("/members/:memberId/role", middleware.RequirePermission(models.PermTeamManage), handler.UpdateMemberRole)
	storeGroup.Delete("/members/:memberId", middleware.RequirePermission(models.PermTeamManage), handler.RemoveMember)
}
