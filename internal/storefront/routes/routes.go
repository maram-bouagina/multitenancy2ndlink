package routes

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/storefront/handlers"
)

// Register mounts the public storefront routes.
// These endpoints require NO authentication — they serve visiting customers.
func Register(app *fiber.App) {
	h := handlers.New()

	// All routes in this group share the StoreContextMiddleware which:
	//   1. Resolves :slug → tenant DB session
	//   2. Attaches store + DB to context locals
	//   3. Closes the DB connection after the handler returns
	g := app.Group("/api/public/stores/:slug", h.StoreContextMiddleware)
	g.Get("/", h.GetStore)
	g.Get("/categories", h.GetCategories)
	g.Get("/collections", h.GetCollections)
	g.Get("/collections/:colSlug", h.GetCollectionProducts)
	g.Get("/products", h.GetProducts)
	g.Get("/products/:productSlug", h.GetProduct)
}
