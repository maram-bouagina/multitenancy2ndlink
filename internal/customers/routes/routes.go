package routes

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/customers/handlers"
	"multitenancypfe/internal/customers/repo"
	"multitenancypfe/internal/customers/services"
	membershipModels "multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/middleware"
	sfHandlers "multitenancypfe/internal/storefront/handlers"
)

// RegisterCustomerRoutes mounts customer account routes on the storefront.
// Auth (register, login, 2FA, social, email verify, password reset) is handled
// by Better Auth on the Next.js side. Go only handles profile + address CRUD.
func RegisterCustomerRoutes(app *fiber.App) {
	customerRepo := repo.New()
	profileSvc := services.NewCustomerProfileService(customerRepo)

	profileHandler := handlers.NewCustomerProfileHandler(profileSvc)
	adminHandler := handlers.NewAdminCustomerHandler(customerRepo)
	importExportHandler := handlers.NewCustomerImportExportHandler()

	sfHandler := sfHandlers.New()

	// ── Authenticated customer account routes (Better Auth session) ──────────
	account := app.Group("/api/public/stores/:slug/account",
		sfHandler.StoreContextMiddleware,
		middleware.RequireCustomerBetterAuth(),
	)
	account.Get("/me", profileHandler.GetProfile)
	account.Put("/profile", profileHandler.UpdateProfile)
	account.Get("/addresses", profileHandler.ListAddresses)
	account.Post("/addresses", profileHandler.CreateAddress)
	account.Put("/addresses/:id", profileHandler.UpdateAddress)
	account.Delete("/addresses/:id", profileHandler.DeleteAddress)
	account.Put("/privacy", profileHandler.UpdatePrivacy)
	account.Delete("/", profileHandler.DeleteAccount)

	// ── Admin (merchant) customer management routes ──────────────────────────
	admin := app.Group("/api/stores/:storeId/customers",
		middleware.RequireAuth(),
		middleware.TenantDB(),
		middleware.EnsureStoreContextMatches("storeId"),
	)
	admin.Get("/export", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.ExportCustomers)
	admin.Post("/import", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.ImportCustomers)
	admin.Get("/import/template", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.CustomerImportTemplate)
	admin.Get("/", middleware.RequirePermission(membershipModels.PermCustomersView), adminHandler.List)
	admin.Get("/:id", middleware.RequirePermission(membershipModels.PermCustomersView), adminHandler.GetByID)
	admin.Put("/:id", middleware.RequirePermission(membershipModels.PermCustomersEdit), adminHandler.Update)
	admin.Delete("/:id", middleware.RequirePermission(membershipModels.PermCustomersDelete), adminHandler.Delete)

	// ── Admin customer groups routes ─────────────────────────────────────────
	groupRepo := repo.NewCustomerGroupRepo()
	groupHandler := handlers.NewCustomerGroupHandler(groupRepo, customerRepo)

	groups := app.Group("/api/stores/:storeId/customer-groups",
		middleware.RequireAuth(),
		middleware.TenantDB(),
		middleware.EnsureStoreContextMatches("storeId"),
	)
	groups.Get("/export", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.ExportCustomerGroups)
	groups.Post("/import", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.ImportCustomerGroups)
	groups.Get("/import/template", middleware.RequirePermission(membershipModels.PermCustomersImportExport), importExportHandler.CustomerGroupImportTemplate)
	groups.Get("/", middleware.RequirePermission(membershipModels.PermCustomersView), groupHandler.List)
	groups.Post("/", middleware.RequirePermission(membershipModels.PermCustomersEdit), groupHandler.Create)
	groups.Get("/:id", middleware.RequirePermission(membershipModels.PermCustomersView), groupHandler.GetByID)
	groups.Put("/:id", middleware.RequirePermission(membershipModels.PermCustomersEdit), groupHandler.Update)
	groups.Delete("/:id", middleware.RequirePermission(membershipModels.PermCustomersDelete), groupHandler.Delete)
	groups.Post("/:id/members", middleware.RequirePermission(membershipModels.PermCustomersEdit), groupHandler.AddMembers)
	groups.Delete("/:id/members", middleware.RequirePermission(membershipModels.PermCustomersEdit), groupHandler.RemoveMembers)
}
