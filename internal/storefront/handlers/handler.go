package handlers

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	storeModels "multitenancypfe/internal/store/models"
	sfDto "multitenancypfe/internal/storefront/dto"
	"multitenancypfe/internal/storefront/repo"
)

// Handler is the public storefront HTTP handler (no authentication required).
type Handler struct {
	r *repo.StorefrontRepo
}

func New() *Handler { return &Handler{r: repo.New()} }

// helpers ─────────────────────────────────────────────────────────────────────

func getSfDB(c *fiber.Ctx) *gorm.DB {
	db, _ := c.Locals("sfDB").(*gorm.DB)
	return db
}

func getSfStore(c *fiber.Ctx) *storeModels.Store {
	s, _ := c.Locals("sfStore").(*storeModels.Store)
	return s
}

// StoreContextMiddleware ──────────────────────────────────────────────────────

// StoreContextMiddleware resolves :slug → tenant DB session + store row.
// It opens exactly ONE pinned DB connection for the whole request lifecycle
// and stores it in context locals for all downstream handlers.
func (h *Handler) StoreContextMiddleware(c *fiber.Ctx) error {
	slug := c.Params("slug")

	entry, err := h.r.SlugLookup(slug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}
	if entry == nil || entry.Status != "active" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "store not found"})
	}

	db, closer, err := repo.TenantScopedDB(entry.TenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db connection failed"})
	}

	store, err := h.r.GetStore(db, entry.StoreID)
	if err != nil {
		closer()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}
	if store == nil {
		closer()
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "store not found"})
	}

	c.Locals("sfDB", db)
	c.Locals("sfStore", store)

	handlerErr := c.Next()
	closer()
	return handlerErr
}

// GET /api/public/stores/:slug ────────────────────────────────────────────────

func (h *Handler) GetStore(c *fiber.Ctx) error {
	store := getSfStore(c)
	return c.JSON(sfDto.StorePublicResponse{
		ID:                  store.ID.String(),
		Name:                store.Name,
		Slug:                store.Slug,
		Logo:                store.Logo,
		Email:               store.Email,
		Phone:               store.Phone,
		Address:             store.Address,
		Currency:            store.Currency,
		Language:            store.Language,
		ThemePrimaryColor:   store.ThemePrimaryColor,
		ThemeSecondaryColor: store.ThemeSecondaryColor,
		ThemeMode:           store.ThemeMode,
		ThemeFontFamily:     store.ThemeFontFamily,
		StorefrontLayout:    store.StorefrontLayoutPublished,
	})
}

// GET /api/public/stores/:slug/categories ────────────────────────────────────

func (h *Handler) GetCategories(c *fiber.Ctx) error {
	db := getSfDB(c)
	store := getSfStore(c)

	cats, err := h.r.ListCategories(db, store.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}

	result := make([]sfDto.CategoryPublicResponse, 0, len(cats))
	for _, cat := range cats {
		result = append(result, repo.ToCategoryPublic(cat))
	}
	return c.JSON(result)
}

// GET /api/public/stores/:slug/collections ───────────────────────────────────

func (h *Handler) GetCollections(c *fiber.Ctx) error {
	db := getSfDB(c)
	store := getSfStore(c)

	cols, err := h.r.ListCollections(db, store.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}

	result := make([]sfDto.CollectionPublicResponse, len(cols))
	for i, col := range cols {
		result[i] = sfDto.CollectionPublicResponse{ID: col.ID.String(), Name: col.Name, Slug: col.Slug}
	}
	return c.JSON(result)
}

// GET /api/public/stores/:slug/collections/:colSlug ──────────────────────────

func (h *Handler) GetCollectionProducts(c *fiber.Ctx) error {
	db := getSfDB(c)
	store := getSfStore(c)
	colSlug := c.Params("colSlug")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	col, products, total, err := h.r.GetCollectionProducts(db, store.ID, colSlug, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}
	if col == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "collection not found"})
	}

	pages := 1
	if limit > 0 {
		pages = int(math.Ceil(float64(total) / float64(limit)))
	}

	items := make([]sfDto.ProductPublicResponse, len(products))
	for i := range products {
		items[i] = repo.ToProductPublic(&products[i], nil)
	}

	return c.JSON(sfDto.CollectionPageResponse{
		Collection: sfDto.CollectionPublicResponse{ID: col.ID.String(), Name: col.Name, Slug: col.Slug},
		Products: sfDto.PaginatedProductsResponse{
			Products: items, Total: total, Page: page, Limit: limit, Pages: pages,
		},
	})
}

// GET /api/public/stores/:slug/products ──────────────────────────────────────
// Query params: search, category_id, price_min, price_max, in_stock, sort, page, limit

func (h *Handler) GetProducts(c *fiber.Ctx) error {
	db := getSfDB(c)
	store := getSfStore(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	filter := repo.ProductFilter{
		Search:  c.Query("search"),
		Sort:    c.Query("sort", "newest"),
		Page:    page,
		Limit:   limit,
		InStock: c.Query("in_stock") == "true",
	}

	if catIDStr := c.Query("category_id"); catIDStr != "" {
		if catID, err := uuid.Parse(catIDStr); err == nil {
			filter.CategoryID = &catID
		}
	}
	if raw := c.Query("price_min"); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			filter.PriceMin = &v
		}
	}
	if raw := c.Query("price_max"); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			filter.PriceMax = &v
		}
	}

	products, total, err := h.r.ListProducts(db, store.ID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}

	pages := 1
	if limit > 0 {
		pages = int(math.Ceil(float64(total) / float64(limit)))
	}

	items := make([]sfDto.ProductPublicResponse, len(products))
	for i := range products {
		items[i] = repo.ToProductPublic(&products[i], nil)
	}

	return c.JSON(sfDto.PaginatedProductsResponse{
		Products: items, Total: total, Page: page, Limit: limit, Pages: pages,
	})
}

// GET /api/public/stores/:slug/products/:productSlug ─────────────────────────

func (h *Handler) GetProduct(c *fiber.Ctx) error {
	db := getSfDB(c)
	store := getSfStore(c)
	productSlug := c.Params("productSlug")

	product, images, related, err := h.r.GetProductBySlug(db, store.ID, productSlug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
	}
	if product == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "product not found"})
	}

	relatedDTOs := make([]sfDto.ProductPublicResponse, len(related))
	for i := range related {
		relatedDTOs[i] = repo.ToProductPublic(&related[i], nil)
	}

	return c.JSON(sfDto.ProductDetailResponse{
		Product: repo.ToProductPublic(product, images),
		Related: relatedDTOs,
	})
}
