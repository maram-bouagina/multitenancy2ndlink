package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/middleware"
	storeHandlers "multitenancypfe/internal/store/handlers"
	"multitenancypfe/internal/store/repo"
	"multitenancypfe/internal/store/services"
)

func RegisterStoreRoutes(app *fiber.App, db *gorm.DB) {
	h := storeHandlers.NewStoreHandler(services.NewStoreService(repo.NewStoreRepository(db)))

	g := app.Group("/api/stores",
		middleware.RequireAuth(),
		middleware.TenantDB(),
	)
	g.Post("/", h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Post("/:id/customization/publish", h.PublishCustomization)
	g.Delete("/:id", h.Delete)
}
