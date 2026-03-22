package repo

import (
	"context"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"multitenancypfe/internal/database"
	prodModels "multitenancypfe/internal/products/models"
	storeModels "multitenancypfe/internal/store/models"
	sfDto "multitenancypfe/internal/storefront/dto"
	sfModels "multitenancypfe/internal/storefront/models"
)

// StorefrontRepo handles all public read-only storefront queries.
type StorefrontRepo struct{}

func New() *StorefrontRepo { return &StorefrontRepo{} }

// ── Slug index ───────────────────────────────────────────────────────────────

// UpsertSlug inserts or updates the public slug → tenant/store mapping.
// Called by the store service after Create, Update, or status changes.
func UpsertSlug(slug string, tenantID, storeID uuid.UUID, status string) error {
	entry := sfModels.StoreSlugIndex{
		Slug:     slug,
		TenantID: tenantID,
		StoreID:  storeID,
		Status:   status,
	}
	return database.DB.Save(&entry).Error
}

// DeleteSlug removes a slug from the index (called when a store is deleted).
func DeleteSlug(slug string) error {
	return database.DB.Where("slug = ?", slug).Delete(&sfModels.StoreSlugIndex{}).Error
}

// SlugLookup resolves a public slug to its tenant partition.
func (r *StorefrontRepo) SlugLookup(slug string) (*sfModels.StoreSlugIndex, error) {
	var entry sfModels.StoreSlugIndex
	err := database.DB.Where("slug = ?", slug).First(&entry).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &entry, err
}

// ── Tenant DB session ────────────────────────────────────────────────────────

// TenantScopedDB opens a dedicated connection pinned to the tenant schema.
// The returned closer MUST be called exactly once when the request finishes.
func TenantScopedDB(tenantID uuid.UUID) (*gorm.DB, func(), error) {
	schema := fmt.Sprintf("tenant_%s", tenantID.String())

	sqlDB, err := database.DB.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("get sql.DB: %w", err)
	}

	conn, err := sqlDB.Conn(context.Background())
	if err != nil {
		return nil, nil, fmt.Errorf("acquire connection: %w", err)
	}

	if _, err = conn.ExecContext(context.Background(),
		fmt.Sprintf("SET search_path TO %q, public", schema),
	); err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("set search_path: %w", err)
	}

	scopedDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{})
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("open scoped gorm: %w", err)
	}

	return scopedDB, func() { conn.Close() }, nil
}

// ── Store ────────────────────────────────────────────────────────────────────

// GetStore returns the active store by its UUID within the scoped tenant DB.
func (r *StorefrontRepo) GetStore(db *gorm.DB, storeID uuid.UUID) (*storeModels.Store, error) {
	var store storeModels.Store
	err := db.Where("id = ? AND status = 'active' AND deleted_at IS NULL", storeID).First(&store).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &store, err
}

// ── Categories ───────────────────────────────────────────────────────────────

// ListCategories returns the public category tree (root nodes with children).
func (r *StorefrontRepo) ListCategories(db *gorm.DB, storeID uuid.UUID) ([]*prodModels.Category, error) {
	var cats []*prodModels.Category
	err := db.
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Where("visibility = 'public'").Order("name ASC")
		}).
		Where("store_id = ? AND visibility = 'public' AND parent_id IS NULL", storeID).
		Order("name ASC").
		Find(&cats).Error
	return cats, err
}

// GetCategoryBySlug returns a single public category by its slug.
func (r *StorefrontRepo) GetCategoryBySlug(db *gorm.DB, storeID uuid.UUID, slug string) (*prodModels.Category, error) {
	var cat prodModels.Category
	err := db.
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Where("visibility = 'public'").Order("name ASC")
		}).
		Where("store_id = ? AND slug = ? AND visibility = 'public'", storeID, slug).
		First(&cat).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &cat, err
}

// ── Collections ──────────────────────────────────────────────────────────────

// ListCollections returns all collections for the store.
func (r *StorefrontRepo) ListCollections(db *gorm.DB, storeID uuid.UUID) ([]prodModels.Collection, error) {
	var cols []prodModels.Collection
	err := db.Where("store_id = ?", storeID).Order("name ASC").Find(&cols).Error
	return cols, err
}

// GetCollectionProducts returns a collection and its paginated published products.
func (r *StorefrontRepo) GetCollectionProducts(
	db *gorm.DB, storeID uuid.UUID, colSlug string, page, limit int,
) (*prodModels.Collection, []prodModels.Product, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var col prodModels.Collection
	if err := db.Where("store_id = ? AND slug = ?", storeID, colSlug).First(&col).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, 0, nil
		}
		return nil, nil, 0, err
	}

	base := db.Table("products p").
		Where("p.store_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL", storeID)

	if col.Type == prodModels.CollectionManual {
		base = base.Joins("JOIN collection_products cp ON cp.product_id = p.id").Where("cp.collection_id = ?", col.ID)
	} else if col.Rule != nil && *col.Rule != "" {
		filteredBase, err := applyStorefrontCollectionRule(base, *col.Rule)
		if err != nil {
			return nil, nil, 0, err
		}
		base = filteredBase
	}

	var total int64
	base.Count(&total)

	var products []prodModels.Product
	err := base.
		Preload("Category").
		Order("p.created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&products).Error

	return &col, products, total, err
}

func applyStorefrontCollectionRule(query *gorm.DB, rule string) (*gorm.DB, error) {
	rule = strings.TrimSpace(rule)
	if rule == "" {
		return query, nil
	}

	re := regexp.MustCompile(`^(price|stock|status|visibility|brand)\s*(>=|<=|>|<|=)\s*(.+)$`)
	matches := re.FindStringSubmatch(rule)
	if len(matches) != 4 {
		return nil, fmt.Errorf("invalid collection rule format")
	}

	field := matches[1]
	operator := matches[2]
	rawValue := strings.TrimSpace(matches[3])
	column := "p." + field

	switch field {
	case "price":
		value, err := strconv.ParseFloat(rawValue, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid price rule value")
		}
		return query.Where(column+" "+operator+" ?", value), nil
	case "stock":
		value, err := strconv.Atoi(rawValue)
		if err != nil {
			return nil, fmt.Errorf("invalid stock rule value")
		}
		return query.Where(column+" "+operator+" ?", value), nil
	case "status", "visibility", "brand":
		if operator != "=" {
			return nil, fmt.Errorf("operator %s not supported for %s", operator, field)
		}
		return query.Where(column+" = ?", rawValue), nil
	default:
		return nil, fmt.Errorf("unsupported collection rule field")
	}
}

// ── Products ─────────────────────────────────────────────────────────────────

// ProductFilter holds public product query options.
type ProductFilter struct {
	Search     string
	CategoryID *uuid.UUID
	PriceMin   *float64
	PriceMax   *float64
	InStock    bool
	Sort       string // newest | oldest | price_asc | price_desc
	Page       int
	Limit      int
}

// ListProducts returns paginated published/public products with optional filters.
func (r *StorefrontRepo) ListProducts(db *gorm.DB, storeID uuid.UUID, f ProductFilter) ([]prodModels.Product, int64, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}

	base := db.Model(&prodModels.Product{}).
		Where("store_id = ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL", storeID)

	if strings.TrimSpace(f.Search) != "" {
		term := "%" + strings.TrimSpace(f.Search) + "%"
		base = base.Where("title ILIKE ? OR description ILIKE ? OR brand ILIKE ?", term, term, term)
	}
	if f.CategoryID != nil {
		base = base.Where("category_id = ?", *f.CategoryID)
	}
	if f.PriceMin != nil {
		base = base.Where("price >= ?", *f.PriceMin)
	}
	if f.PriceMax != nil {
		base = base.Where("price <= ?", *f.PriceMax)
	}
	if f.InStock {
		base = base.Where("(NOT track_stock OR stock > 0)")
	}

	var total int64
	base.Count(&total)

	switch f.Sort {
	case "price_asc":
		base = base.Order("price ASC")
	case "price_desc":
		base = base.Order("price DESC")
	case "oldest":
		base = base.Order("created_at ASC")
	default:
		base = base.Order("created_at DESC")
	}

	var products []prodModels.Product
	err := base.
		Preload("Category").
		Offset((f.Page - 1) * f.Limit).
		Limit(f.Limit).
		Find(&products).Error

	return products, total, err
}

// GetProductBySlug returns product detail with images and related products.
func (r *StorefrontRepo) GetProductBySlug(
	db *gorm.DB, storeID uuid.UUID, slug string,
) (*prodModels.Product, []prodModels.ProductImage, []prodModels.Product, error) {
	var product prodModels.Product
	err := db.Where(
		"store_id = ? AND slug = ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL",
		storeID, slug,
	).
		Preload("Category").
		Preload("Collections").
		First(&product).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, nil, nil
	}
	if err != nil {
		return nil, nil, nil, err
	}

	// Images ordered by position
	var images []prodModels.ProductImage
	db.Where("product_id = ?", product.ID).Order("position ASC").Find(&images)

	// Related products from the same category (random, max 4)
	var related []prodModels.Product
	if product.CategoryID != nil {
		db.Where(
			"store_id = ? AND category_id = ? AND id != ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL",
			storeID, product.CategoryID, product.ID,
		).Order("RANDOM()").Limit(4).Find(&related)
	}

	return &product, images, related, nil
}

// ── Conversion helpers ───────────────────────────────────────────────────────

// EffectivePrice returns (effectivePrice, isOnSale).
func EffectivePrice(p *prodModels.Product) (float64, bool) {
	now := time.Now()
	if p.SalePrice != nil {
		active := true
		if p.SaleStart != nil && now.Before(*p.SaleStart) {
			active = false
		}
		if p.SaleEnd != nil && now.After(*p.SaleEnd) {
			active = false
		}
		if active {
			return *p.SalePrice, true
		}
	}
	return p.Price, false
}

// ToCategoryPublic converts a Category model to a public DTO (recursive).
func ToCategoryPublic(c *prodModels.Category) sfDto.CategoryPublicResponse {
	resp := sfDto.CategoryPublicResponse{
		ID:          c.ID.String(),
		Name:        c.Name,
		Slug:        c.Slug,
		Description: c.Description,
	}
	for i := range c.Children {
		resp.Children = append(resp.Children, ToCategoryPublic(&c.Children[i]))
	}
	return resp
}

// ToProductPublic converts a Product model + images to the public response DTO.
func ToProductPublic(p *prodModels.Product, images []prodModels.ProductImage) sfDto.ProductPublicResponse {
	effPrice, isOnSale := EffectivePrice(p)

	resp := sfDto.ProductPublicResponse{
		ID:                p.ID.String(),
		Title:             p.Title,
		Slug:              p.Slug,
		Description:       p.Description,
		Price:             p.Price,
		EffectivePrice:    effPrice,
		IsOnSale:          isOnSale,
		Currency:          p.Currency,
		Brand:             p.Brand,
		SKU:               p.SKU,
		Weight:            p.Weight,
		Dimensions:        p.Dimensions,
		TaxClass:          p.TaxClass,
		TrackStock:        p.TrackStock,
		InStock:           !p.TrackStock || p.Stock > 0,
		Stock:             p.Stock,
		LowStockThreshold: p.LowStockThreshold,
		CreatedAt:         p.CreatedAt.Format(time.RFC3339),
		Images:            make([]sfDto.ProductImagePublicResponse, 0, len(images)),
	}

	if isOnSale && p.SalePrice != nil {
		resp.SalePrice = p.SalePrice
	}
	if isOnSale && p.SaleEnd != nil {
		s := p.SaleEnd.Format(time.RFC3339)
		resp.SaleEnd = &s
	}
	if p.CategoryID != nil {
		s := p.CategoryID.String()
		resp.CategoryID = &s
	}
	if p.Category != nil {
		c := ToCategoryPublic(p.Category)
		resp.Category = &c
	}
	for _, col := range p.Collections {
		resp.Collections = append(resp.Collections, sfDto.CollectionPublicResponse{
			ID:   col.ID.String(),
			Name: col.Name,
			Slug: col.Slug,
		})
	}
	for _, img := range images {
		resp.Images = append(resp.Images, sfDto.ProductImagePublicResponse{
			URL:          img.URL,
			URLThumbnail: img.URLThumbnail,
			URLMedium:    img.URLMedium,
			URLLarge:     img.URLLarge,
			AltText:      img.AltText,
			Position:     img.Position,
		})
	}
	return resp
}

// BuildPaginatedProducts assembles a paginated response from a flat products slice.
func BuildPaginatedProducts(products []prodModels.Product, total int64, page, limit int) sfDto.PaginatedProductsResponse {
	pages := 1
	if limit > 0 {
		pages = int(math.Ceil(float64(total) / float64(limit)))
	}
	items := make([]sfDto.ProductPublicResponse, len(products))
	for i := range products {
		items[i] = ToProductPublic(&products[i], nil)
	}
	return sfDto.PaginatedProductsResponse{
		Products: items,
		Total:    total,
		Page:     page,
		Limit:    limit,
		Pages:    pages,
	}
}
