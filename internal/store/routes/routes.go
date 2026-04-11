package routes

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	authRepo "multitenancypfe/internal/auth/repo"
	"multitenancypfe/internal/media"
	membershipModels "multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/middleware"
	storeHandlers "multitenancypfe/internal/store/handlers"
	"multitenancypfe/internal/store/repo"
	"multitenancypfe/internal/store/services"
)

func RegisterStoreRoutes(app *fiber.App, db *gorm.DB) {
	storage, err := media.NewStorageFromEnv()
	if err != nil {
		log.Fatalf("store media storage initialization failed: %v", err)
	}

	pageRepo := repo.NewPageRepository()
	h := storeHandlers.NewStoreHandler(
		services.NewStoreService(repo.NewStoreRepository(), authRepo.NewTenantRepository(db), pageRepo),
		storage,
	)
	ph := storeHandlers.NewPageHandler(services.NewPageService(pageRepo))

	g := app.Group("/api/stores",
		middleware.RequireAuth(),
		middleware.TenantDB(),
	)
	// Store routes (inchangées)
	g.Post("/", middleware.RequireOwnerContext(), h.Create)
	g.Get("/", middleware.RequireOwnerContext(), h.GetAll)
	g.Get("/:id", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStoreSettingsEdit), h.GetByID)
	g.Put("/:id", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStoreSettingsEdit), h.Update)
	g.Patch("/:id/status", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStorePublish), h.UpdateStatus)
	g.Post("/:id/logo", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStoreMediaUpload), h.UploadLogo)
	g.Post("/:id/media", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStoreMediaUpload), h.UploadMedia)
	g.Post("/:id/customization/publish", middleware.EnsureStoreContextMatches("id"), middleware.RequirePermission(membershipModels.PermStorePublish), h.PublishCustomization)
	g.Delete("/:id", middleware.EnsureStoreContextMatches("id"), middleware.RequireOwnerContext(), h.Delete)

	// Page routes
	g.Get("/:storeId/pages", middleware.EnsureStoreContextMatches("storeId"), middleware.RequireAnyPermission(membershipModels.PermStorePages, membershipModels.PermStoreCustomization), ph.List)
	g.Post("/:storeId/pages", middleware.EnsureStoreContextMatches("storeId"), middleware.RequirePermission(membershipModels.PermStorePages), ph.Create)
	g.Get("/:storeId/pages/:pageId", middleware.EnsureStoreContextMatches("storeId"), middleware.RequireAnyPermission(membershipModels.PermStorePages, membershipModels.PermStoreCustomization), ph.GetByID)
	g.Put("/:storeId/pages/:pageId", middleware.EnsureStoreContextMatches("storeId"), middleware.RequirePermission(membershipModels.PermStorePages), ph.Update)
	g.Post("/:storeId/pages/:pageId/publish", middleware.EnsureStoreContextMatches("storeId"), middleware.RequirePermission(membershipModels.PermStorePublish), ph.Publish)
	g.Delete("/:storeId/pages/:pageId", middleware.EnsureStoreContextMatches("storeId"), middleware.RequirePermission(membershipModels.PermStorePages), ph.Delete)
}
