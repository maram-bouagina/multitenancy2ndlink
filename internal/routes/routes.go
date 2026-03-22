package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	authroutes "multitenancypfe/internal/auth/routes"
	productroutes "multitenancypfe/internal/products/routes"
	storeroutes "multitenancypfe/internal/store/routes"
	storefrontroutes "multitenancypfe/internal/storefront/routes"
)

func Register(app *fiber.App, db *gorm.DB) {
	authroutes.RegisterAuthRoutes(app, db)
	storeroutes.RegisterStoreRoutes(app, db)
	productroutes.RegisterProductRoutes(app, db)
	storefrontroutes.Register(app) // public storefront — no auth
}
