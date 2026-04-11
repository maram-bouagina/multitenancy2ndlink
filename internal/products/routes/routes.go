package routes

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/media"
	membershipModels "multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/handlers"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"

	authRepo "multitenancypfe/internal/auth/repo"
)

func RegisterProductRoutes(app *fiber.App, db *gorm.DB) {
	storage, err := media.NewStorageFromEnv()
	if err != nil {
		log.Fatalf("media storage initialization failed: %v", err)
	}
	maxImageSizeMB := resolveMaxImageUploadSizeMB()
	imageValidationSvc := services.NewImageValidationService()
	imageUploadSvc := services.NewProductImageUploadService(imageValidationSvc, storage, maxImageSizeMB)

	mediaHandler := handlers.NewMediaHandler(storage)
	app.Get("/media/*", mediaHandler.Serve)

	store := app.Group("/api/stores/:storeId",
		middleware.RequireAuth(),
		middleware.TenantDB(),
		middleware.EnsureStoreContextMatches("storeId"),
	)
	registerSearch(store, db)
	registerProducts(store, db, imageUploadSvc, maxImageSizeMB)
	registerImages(store, db, storage, imageUploadSvc)
	registerCategories(store, db)
	registerCollections(store, db)
	registerTags(store, db)
	registerCatalog(store, db)
}

func registerCatalog(store fiber.Router, db *gorm.DB) {
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository(), nil, 0)

	g := store.Group("/catalog")
	g.Get("/export", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ExportFullCatalog)
	g.Delete("/purge", middleware.RequirePermission(membershipModels.PermProductsDelete), importExportHandler.PurgeCatalog)
	g.Get("/duplicates", middleware.RequirePermission(membershipModels.PermProductsEdit), importExportHandler.FindDuplicates)
}

func registerProducts(store fiber.Router, db *gorm.DB, imageUploadSvc services.ProductImageUploadService, maxImageSizeMB int64) {
	// Import the auth repo package at the top if not already imported:
	// import authRepo "multitenancypfe/internal/auth/repo"
	productHandler := handlers.NewProductHandler(
		services.NewProductService(
			repo.NewProductRepository(),
			authRepo.NewTenantRepository(db),
		),
		services.NewPricingService(),
		services.NewPublicationValidationService(),
	)
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository(), imageUploadSvc, maxImageSizeMB)

	g := store.Group("/products")

	// Import/Export (static routes first)
	g.Get("/export", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ExportProducts)
	g.Post("/import", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ImportProducts)
	g.Get("/import/template", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ProductImportTemplate)

	// CRUD
	g.Post("/", middleware.RequirePermission(membershipModels.PermProductsCreate), productHandler.Create)
	g.Get("/", productHandler.GetAll)
	g.Get("/:id", productHandler.GetByID)
	relationHandler := handlers.NewProductRelationHandler()
	g.Get("/:id/relations", relationHandler.GetByProduct)
	g.Put("/:id", middleware.RequirePermission(membershipModels.PermProductsEdit), productHandler.Update)
	g.Put("/:id/relations", middleware.RequirePermission(membershipModels.PermProductsEdit), relationHandler.ReplaceForProduct)
	g.Delete("/:id", middleware.RequirePermission(membershipModels.PermProductsDelete), productHandler.Delete)
	g.Post("/:id/clone", middleware.RequirePermission(membershipModels.PermProductsCreate), productHandler.Clone)
	g.Post("/:id/stock/adjust", middleware.RequirePermission(membershipModels.PermProductsEdit), productHandler.AdjustStock)
	g.Post("/:id/stock/reserve", middleware.RequirePermission(membershipModels.PermProductsEdit), productHandler.ReserveStock)
}

func registerCategories(store fiber.Router, db *gorm.DB) {
	h := handlers.NewCategoryHandler()
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository(), nil, 0)

	g := store.Group("/categories")

	// Import/Export (static routes first)
	g.Get("/export", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ExportCategories)
	g.Post("/import", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ImportCategories)
	g.Get("/import/template", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.CategoryImportTemplate)

	// CRUD
	g.Post("/", middleware.RequirePermission(membershipModels.PermCategoriesManage), h.Create)
	g.Get("/", h.GetTree)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", middleware.RequirePermission(membershipModels.PermCategoriesManage), h.Update)
	g.Delete("/:id", middleware.RequirePermission(membershipModels.PermCategoriesManage), h.Delete)
}

func registerCollections(store fiber.Router, db *gorm.DB) {
	collectionHandler := handlers.NewCollectionHandler()
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository(), nil, 0)

	g := store.Group("/collections")

	// Import/Export (static routes first)
	g.Get("/export", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ExportCollections)
	g.Post("/import", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.ImportCollections)
	g.Get("/import/template", middleware.RequirePermission(membershipModels.PermProductsImportExport), importExportHandler.CollectionImportTemplate)

	// CRUD
	g.Post("/", middleware.RequirePermission(membershipModels.PermCollectionsManage), collectionHandler.Create)
	g.Get("/", collectionHandler.GetAll)
	g.Get("/:id", collectionHandler.GetByID)
	g.Put("/:id", middleware.RequirePermission(membershipModels.PermCollectionsManage), collectionHandler.Update)
	g.Delete("/:id", middleware.RequirePermission(membershipModels.PermCollectionsManage), collectionHandler.Delete)
	g.Get("/:id/products", collectionHandler.GetProducts)
	g.Post("/:id/products/:productId", middleware.RequirePermission(membershipModels.PermCollectionsManage), collectionHandler.AddProduct)
	g.Delete("/:id/products/:productId", middleware.RequirePermission(membershipModels.PermCollectionsManage), collectionHandler.RemoveProduct)
}

func registerImages(store fiber.Router, db *gorm.DB, storage media.Storage, imageUploadSvc services.ProductImageUploadService) {
	imageHandler := handlers.NewImageHandler(imageUploadSvc, storage)

	g := store.Group("/products/:productId/images")
	g.Post("/", middleware.RequirePermission(membershipModels.PermStoreMediaUpload), imageHandler.Create)
	g.Get("/", imageHandler.GetByProductID)
	g.Put("/:imageId", middleware.RequirePermission(membershipModels.PermStoreMediaUpload), imageHandler.Update)
	g.Delete("/:imageId", middleware.RequirePermission(membershipModels.PermStoreMediaUpload), imageHandler.Delete)
	g.Post("/reorder", middleware.RequirePermission(membershipModels.PermStoreMediaUpload), imageHandler.Reorder)
}

func resolveMaxImageUploadSizeMB() int64 {
	maxFileSizeMB := int64(10)
	if raw := strings.TrimSpace(os.Getenv("MAX_IMAGE_UPLOAD_MB")); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			maxFileSizeMB = parsed
		}
	}
	return maxFileSizeMB
}

func registerTags(store fiber.Router, db *gorm.DB) {
	h := handlers.NewTagHandler()
	importExportHandler := handlers.NewImportExportHandler(repo.NewProductRepository(), nil, 0)

	g := store.Group("/tags")

	// Import/Export (static routes first)
	g.Get("/export", importExportHandler.ExportTags)
	g.Post("/import", importExportHandler.ImportTags)
	g.Get("/import/template", importExportHandler.TagImportTemplate)

	// CRUD
	g.Post("/", middleware.RequirePermission(membershipModels.PermTagsManage), h.Create)
	g.Get("/", h.GetAll)
	g.Get("/:id", h.GetByID)
	g.Put("/:id", middleware.RequirePermission(membershipModels.PermTagsManage), h.Update)
	g.Delete("/:id", middleware.RequirePermission(membershipModels.PermTagsManage), h.Delete)

	// Assign tags to product
	g = store.Group("/products/:productId/tags")
	g.Post("/", middleware.RequirePermission(membershipModels.PermTagsManage), h.AssignToProduct)
}

func registerSearch(store fiber.Router, db *gorm.DB) {
	h := handlers.NewSearchHandler(services.NewProductSearchService(repo.NewProductRepository()))

	g := store.Group("/products")
	g.Get("/search", h.Search)
}
