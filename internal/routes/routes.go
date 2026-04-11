package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	authroutes "multitenancypfe/internal/auth/routes"
	customerroutes "multitenancypfe/internal/customers/routes"
	membershiproutes "multitenancypfe/internal/membership/routes"
	productroutes "multitenancypfe/internal/products/routes"
	storeroutes "multitenancypfe/internal/store/routes"
	storefrontroutes "multitenancypfe/internal/storefront/routes"
)

func Register(app *fiber.App, db *gorm.DB) {
	authroutes.RegisterAuthRoutes(app, db)
	storeroutes.RegisterStoreRoutes(app, db)
	productroutes.RegisterProductRoutes(app, db)
	storefrontroutes.Register(app)                 // public storefront — no auth
	customerroutes.RegisterCustomerRoutes(app)     // customer auth + account
	membershiproutes.RegisterMembershipRoutes(app) // cross-tenant membership

}
