package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/auth/handlers"
	"multitenancypfe/internal/auth/repo"
	"multitenancypfe/internal/auth/services"
	"multitenancypfe/internal/middleware"
)

func RegisterAuthRoutes(app *fiber.App, db *gorm.DB) {
	api := app.Group("/api")

	registerLoginRoutes(api, db)
	registerAdminRoutes(api, db)
	registerTenantRoutes(api, db)
}

// POST /api/auth/tenant/login
func registerLoginRoutes(api fiber.Router, db *gorm.DB) {
	h := handlers.NewTenantAuthHandler(services.NewTenantAuthService(repo.NewTenantRepository(db)))

	auth := api.Group("/auth")
	auth.Post("/tenant/login", h.Login)
	auth.Post("/tenant/logout", h.Logout)
	auth.Get("/tenant/me", middleware.RequireAuth(), h.Me)
}

func registerAdminRoutes(api fiber.Router, db *gorm.DB) {
	h := handlers.NewAdminHandler(services.NewAdminService(repo.NewAdminRepository(db)))

	g := api.Group("/admins")
	g.Post("/", h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Delete("/:id", h.Delete)
}

func registerTenantRoutes(api fiber.Router, db *gorm.DB) {
	h := handlers.NewTenantHandler(services.NewTenantService(repo.NewTenantRepository(db)))

	g := api.Group("/tenants")
	g.Post("/", h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Delete("/:id", h.Delete)
	g.Post("/:id/restore", h.Restore)
}
