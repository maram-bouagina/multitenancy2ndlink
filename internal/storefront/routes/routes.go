package routes

import (
	"github.com/gofiber/fiber/v2"

	storeHandlers "multitenancypfe/internal/store/handlers"
	"multitenancypfe/internal/store/repo"
	"multitenancypfe/internal/store/services"
	"multitenancypfe/internal/storefront/handlers"
)

// Register mounts the public storefront routes.
// These endpoints require NO authentication — they serve visiting customers.
func Register(app *fiber.App) {
	h := handlers.New()
	ph := storeHandlers.NewPageHandler(services.NewPageService(repo.NewPageRepository()))

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
	g.Post("/newsletter/subscribe", h.NewsletterSubscribe)
	g.Get("/pages", ph.ListPublic)
	g.Get("/pages/:pageSlug", ph.GetPublic)
}
