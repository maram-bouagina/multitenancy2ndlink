package routes

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/media"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/handlers"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

func RegisterProductRoutes(app *fiber.App, db *gorm.DB) {
	storage, err := media.NewStorageFromEnv()
	if err != nil {
		log.Fatalf("media storage initialization failed: %v", err)
	}

	mediaHandler := handlers.NewMediaHandler(storage)
	app.Get("/media/*", mediaHandler.Serve)

	store := app.Group("/api/stores/:storeId",
		middleware.RequireAuth(),
		middleware.TenantDB(),
	)
	registerSearch(store, db)
	registerProducts(store, db)
	registerImages(store, db, storage)
	registerCategories(store, db)
	registerCollections(store, db)
	registerTags(store, db)
}

func registerProducts(store fiber.Router, db *gorm.DB) {
	productHandler := handlers.NewProductHandler(
		services.NewProductService(repo.NewProductRepository()),
		services.NewPricingService(),
		services.NewPublicationValidationService(),
	)
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository())

	g := store.Group("/products")

	// Import/Export (static routes first)
	g.Get("/export", importExportHandler.ExportProducts)
	g.Post("/import", importExportHandler.ImportProducts)
	g.Get("/import/template", importExportHandler.ProductImportTemplate)

	// CRUD
	g.Post("/", productHandler.Create)
	g.Get("/", productHandler.GetAll)
	g.Get("/:id", productHandler.GetByID)
	g.Put("/:id", productHandler.Update)
	g.Delete("/:id", productHandler.Delete)
	g.Post("/:id/clone", productHandler.Clone)
	g.Post("/:id/stock/adjust", productHandler.AdjustStock)
	g.Post("/:id/stock/reserve", productHandler.ReserveStock)
}

func registerCategories(store fiber.Router, db *gorm.DB) {
	h := handlers.NewCategoryHandler()
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository())

	g := store.Group("/categories")

	// Import/Export (static routes first)
	g.Get("/export", importExportHandler.ExportCategories)
	g.Post("/import", importExportHandler.ImportCategories)
	g.Get("/import/template", importExportHandler.CategoryImportTemplate)

	// CRUD
	g.Post("/", h.Create)
	g.Get("/", h.GetTree)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Delete("/:id", h.Delete)
}

func registerCollections(store fiber.Router, db *gorm.DB) {
	collectionHandler := handlers.NewCollectionHandler()

	g := store.Group("/collections")
	g.Post("/", collectionHandler.Create)
	g.Get("/", collectionHandler.GetAll)
	g.Get("/:id", collectionHandler.GetByID)
	g.Put("/:id", collectionHandler.Update)
	g.Delete("/:id", collectionHandler.Delete)
	g.Get("/:id/products", collectionHandler.GetProducts)
	g.Post("/:id/products/:productId", collectionHandler.AddProduct)
	g.Delete("/:id/products/:productId", collectionHandler.RemoveProduct)
}

func registerImages(store fiber.Router, db *gorm.DB, storage media.Storage) {
	maxFileSizeMB := int64(10)
	if raw := strings.TrimSpace(os.Getenv("MAX_IMAGE_UPLOAD_MB")); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			maxFileSizeMB = parsed
		}
	}

	imageHandler := handlers.NewImageHandler(
		services.NewImageValidationService(),
		services.NewPricingService(),
		services.NewPublicationValidationService(),
		storage,
		maxFileSizeMB,
	)

	g := store.Group("/products/:productId/images")
	g.Post("/", imageHandler.Create)
	g.Get("/", imageHandler.GetByProductID)
	g.Put("/:imageId", imageHandler.Update)
	g.Delete("/:imageId", imageHandler.Delete)
	g.Post("/reorder", imageHandler.Reorder)
}

func registerTags(store fiber.Router, db *gorm.DB) {
	h := handlers.NewTagHandler()

	g := store.Group("/tags")
	g.Post("/", h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", h.Update)
	g.Delete("/:id", h.Delete)

	// Assign tags to product
	g = store.Group("/products/:productId/tags")
	g.Post("/", h.AssignToProduct)
}

func registerSearch(store fiber.Router, db *gorm.DB) {
	h := handlers.NewSearchHandler(services.NewProductSearchService(repo.NewProductRepository()))

	g := store.Group("/products")
	g.Get("/search", h.Search)
}
