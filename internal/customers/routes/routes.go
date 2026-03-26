package routes

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/customers/handlers"
	"multitenancypfe/internal/customers/repo"
	"multitenancypfe/internal/customers/services"
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
	)
	admin.Get("/export", importExportHandler.ExportCustomers)
	admin.Post("/import", importExportHandler.ImportCustomers)
	admin.Get("/import/template", importExportHandler.CustomerImportTemplate)
	admin.Get("/", adminHandler.List)
	admin.Get("/:id", adminHandler.GetByID)
	admin.Put("/:id", adminHandler.Update)
	admin.Delete("/:id", adminHandler.Delete)

	// ── Admin customer groups routes ─────────────────────────────────────────
	groupRepo := repo.NewCustomerGroupRepo()
	groupHandler := handlers.NewCustomerGroupHandler(groupRepo, customerRepo)

	groups := app.Group("/api/stores/:storeId/customer-groups",
		middleware.RequireAuth(),
		middleware.TenantDB(),
	)
	groups.Get("/export", importExportHandler.ExportCustomerGroups)
	groups.Post("/import", importExportHandler.ImportCustomerGroups)
	groups.Get("/import/template", importExportHandler.CustomerGroupImportTemplate)
	groups.Get("/", groupHandler.List)
	groups.Post("/", groupHandler.Create)
	groups.Get("/:id", groupHandler.GetByID)
	groups.Put("/:id", groupHandler.Update)
	groups.Delete("/:id", groupHandler.Delete)
	groups.Post("/:id/members", groupHandler.AddMembers)
	groups.Delete("/:id/members", groupHandler.RemoveMembers)
}
