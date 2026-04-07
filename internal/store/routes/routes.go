package routes

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	authRepo "multitenancypfe/internal/auth/repo"
	"multitenancypfe/internal/media"
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
	g.Post("/", h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Patch("/:id/status", h.UpdateStatus)
	g.Post("/:id/logo", h.UploadLogo)
	g.Post("/:id/media", h.UploadMedia)
	g.Post("/:id/customization/publish", h.PublishCustomization)
	g.Delete("/:id", h.Delete)

	// Page routes
	g.Get("/:storeId/pages", ph.List)
	g.Post("/:storeId/pages", ph.Create)
	g.Get("/:storeId/pages/:pageId", ph.GetByID)
	g.Put("/:storeId/pages/:pageId", ph.Update)
	g.Post("/:storeId/pages/:pageId/publish", ph.Publish)
	g.Delete("/:storeId/pages/:pageId", ph.Delete)
}
