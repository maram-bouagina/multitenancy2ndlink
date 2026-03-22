package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

// Interface du service pour les produits
type ProductService interface {
	Create(db *gorm.DB, storeID uuid.UUID, req dto.CreateProductRequest) (*dto.ProductResponse, error)
	GetByID(db *gorm.DB, id, storeID uuid.UUID) (*dto.ProductResponse, error)
	GetAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) (*dto.ProductListResponse, error)
	Update(db *gorm.DB, id, storeID uuid.UUID, req dto.UpdateProductRequest) (*dto.ProductResponse, error)
	Delete(db *gorm.DB, id, storeID uuid.UUID) error
	Clone(db *gorm.DB, id, storeID uuid.UUID, req dto.CloneProductRequest) (*dto.CloneProductResponse, error)
	AdjustStock(db *gorm.DB, id, storeID uuid.UUID, req dto.AdjustStockRequest) (*dto.StockAdjustmentResponse, error)
	ReserveStock(db *gorm.DB, id, storeID, userID uuid.UUID, req dto.StockReservationRequest) (*dto.StockReservationResponse, error)
}

type productService struct {
	repo repo.ProductRepository
}

func NewProductService(r repo.ProductRepository) ProductService {
	return &productService{repo: r}
}

// Crée un produit avec slug unique
func (s *productService) Create(db *gorm.DB, storeID uuid.UUID, req dto.CreateProductRequest) (*dto.ProductResponse, error) {
	slug := resolveSlug(req.Slug, req.Title)
	exists, err := s.repo.SlugExists(db, slug, storeID, nil)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("slug already in use")
	}

	// Validation for public products
	if req.Visibility == models.VisibilityPublic {
		if req.Price <= 0 {
			return nil, errors.New("price must be greater than 0 for public products")
		}
	}

	// Vérification logique des soldes
	if req.SalePrice != nil && req.SaleStart != nil && req.SaleEnd != nil && req.SaleEnd.Before(*req.SaleStart) {
		return nil, errors.New("sale end date cannot be before start date")
	}

	product := &models.Product{
		StoreID:     storeID,
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		Slug:        slug,
		Status:      req.Status,
		Visibility:  req.Visibility,
		Price:       req.Price,
		SalePrice:   req.SalePrice,
		SaleStart:   req.SaleStart,
		SaleEnd:     req.SaleEnd,
		Currency:    req.Currency,
		SKU:         req.SKU,
		TrackStock:  req.TrackStock,
		Stock:       req.Stock,
		Weight:      req.Weight,
		Dimensions:  req.Dimensions,
		Brand:       req.Brand,
		TaxClass:    req.TaxClass,
		PublishedAt: req.PublishedAt,
	}

	if err := s.repo.Create(db, product); err != nil {
		return nil, err
	}
	return toProductResponse(product), nil
}

// Récupère un produit par ID
func (s *productService) GetByID(db *gorm.DB, id, storeID uuid.UUID) (*dto.ProductResponse, error) {
	product, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}
	return toProductResponse(product), nil
}

// Liste tous les produits avec filtres
func (s *productService) GetAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) (*dto.ProductListResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	total, err := s.repo.CountAll(db, storeID, filter)
	if err != nil {
		return nil, err
	}

	products, err := s.repo.FindAll(db, storeID, filter)
	if err != nil {
		return nil, err
	}

	result := make([]dto.ProductResponse, len(products))
	for i, p := range products {
		result[i] = *toProductResponse(&p)
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}

	return &dto.ProductListResponse{
		Data:       result,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

// Met à jour un produit
func (s *productService) Update(db *gorm.DB, id, storeID uuid.UUID, req dto.UpdateProductRequest) (*dto.ProductResponse, error) {
	product, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}

	// Vérifie que le nouveau slug n'est pas déjà pris
	if req.Slug != nil {
		exists, err := s.repo.SlugExists(db, *req.Slug, storeID, &id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("slug already in use")
		}
		product.Slug = *req.Slug
	}

	// Met à jour les champs si présents
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.Title != nil {
		product.Title = *req.Title
	}
	if req.Description != nil {
		product.Description = req.Description
	}
	if req.Status != nil {
		product.Status = *req.Status
	}
	if req.Visibility != nil {
		product.Visibility = *req.Visibility
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.SalePrice != nil {
		product.SalePrice = req.SalePrice
	}
	if req.SaleStart != nil {
		product.SaleStart = req.SaleStart
	}
	if req.SaleEnd != nil {
		product.SaleEnd = req.SaleEnd
	}
	if req.Currency != nil {
		product.Currency = *req.Currency
	}
	if req.SKU != nil {
		product.SKU = req.SKU
	}
	if req.TrackStock != nil {
		product.TrackStock = *req.TrackStock
	}
	if req.Stock != nil {
		product.Stock = *req.Stock
	}
	if req.Weight != nil {
		product.Weight = req.Weight
	}
	if req.Dimensions != nil {
		product.Dimensions = req.Dimensions
	}
	if req.Brand != nil {
		product.Brand = req.Brand
	}
	if req.TaxClass != nil {
		product.TaxClass = req.TaxClass
	}
	if req.PublishedAt != nil {
		product.PublishedAt = req.PublishedAt
	}

	if err := s.repo.Update(db, product); err != nil {
		return nil, err
	}

	return toProductResponse(product), nil
}

// Supprime un produit
func (s *productService) Delete(db *gorm.DB, id, storeID uuid.UUID) error {
	if _, err := s.findOrFail(db, id, storeID); err != nil {
		return err
	}
	return s.repo.Delete(db, id, storeID)
}

// Clone a product with new SKU
func (s *productService) Clone(db *gorm.DB, id, storeID uuid.UUID, req dto.CloneProductRequest) (*dto.CloneProductResponse, error) {
	original, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}

	// Create base new SKU
	baseSKU := ""
	if original.SKU != nil {
		baseSKU = *original.SKU
	}
	if req.SKUSuffix != nil && *req.SKUSuffix != "" {
		baseSKU += *req.SKUSuffix
	} else {
		baseSKU += "-CLONE"
	}

	// Generate unique SKU
	newSKU := s.generateUniqueSKU(db, baseSKU, storeID)

	// Generate unique slug
	baseSlug := resolveSlug(nil, req.Title)
	newSlug := s.generateUniqueSlug(db, baseSlug, storeID)

	// Create cloned product
	cloned := &models.Product{
		ID:                uuid.New(),
		StoreID:           original.StoreID,
		CategoryID:        original.CategoryID,
		Title:             req.Title,
		Slug:              newSlug,
		Description:       original.Description,
		Status:            models.StatusDraft,
		Visibility:        original.Visibility,
		Price:             original.Price,
		SalePrice:         original.SalePrice,
		SaleStart:         original.SaleStart,
		SaleEnd:           original.SaleEnd,
		Currency:          original.Currency,
		SKU:               &newSKU,
		Stock:             original.Stock,
		TrackStock:        original.TrackStock,
		LowStockThreshold: original.LowStockThreshold,
	}

	if err := s.repo.Create(db, cloned); err != nil {
		return nil, err
	}

	// If requested, copy images
	if req.IncludeImages {
		// This would require image repository access
		// For now, we'll skip image copying
		_ = req.IncludeImages
	}

	resp := &dto.CloneProductResponse{
		ClonedProduct: &dto.ProductDetailResponse{
			ProductResponse: *toProductResponse(cloned),
			// Images, tags, attributes would be populated here
		},
		Message: "Product cloned successfully",
	}

	return resp, nil
}

// Adjust product stock
func (s *productService) AdjustStock(db *gorm.DB, id, storeID uuid.UUID, req dto.AdjustStockRequest) (*dto.StockAdjustmentResponse, error) {
	product, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}

	oldStock := product.Stock

	// Instead of replacing, add the change
	product.Stock = product.Stock + req.Quantity

	if err := s.repo.Update(db, product); err != nil {
		return nil, err
	}

	resp := &dto.StockAdjustmentResponse{
		ProductID:     id,
		PreviousStock: oldStock,
		NewStock:      product.Stock,
	}

	// Check if below threshold (or negative)
	isLowStock := product.Stock <= 0
	if product.LowStockThreshold != nil && product.Stock <= *product.LowStockThreshold {
		isLowStock = true
	}
	resp.IsLowStock = isLowStock
	resp.LowStockThreshold = product.LowStockThreshold

	return resp, nil
}

// Reserve product stock
func (s *productService) ReserveStock(db *gorm.DB, id, storeID, userID uuid.UUID, req dto.StockReservationRequest) (*dto.StockReservationResponse, error) {
	product, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}

	// Check if user already has a reservation for this product
	hasReservation, err := s.repo.UserHasReservation(db, id, userID)
	if err != nil {
		return nil, err
	}
	if hasReservation {
		return nil, errors.New("user already has an active reservation for this product")
	}

	// Calculate current available stock (total - reserved)
	totalReserved, err := s.repo.GetTotalReservedStock(db, id)
	if err != nil {
		return nil, err
	}

	availableStock := product.Stock - totalReserved
	if availableStock < req.Quantity {
		return nil, errors.New("insufficient available stock to reserve")
	}

	// Create a reservation record
	reservation := &models.StockReservation{
		ID:        uuid.New(),
		ProductID: id,
		UserID:    userID,
		Quantity:  req.Quantity,
		Reason:    "order_pending",
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hour hold
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateReservation(db, reservation); err != nil {
		return nil, err
	}

	return &dto.StockReservationResponse{
		ReservationID:    reservation.ID,
		ProductID:        id,
		QuantityReserved: req.Quantity,
		AvailableStock:   availableStock - req.Quantity,
		ExpiresAt:        reservation.ExpiresAt,
	}, nil
}

// findOrFail retrieves a product by ID and storeID, returning an error if not found
func (s *productService) findOrFail(db *gorm.DB, id, storeID uuid.UUID) (*models.Product, error) {
	product, err := s.repo.FindByID(db, id, storeID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, errors.New("product not found")
	}
	return product, nil
}

// Generate a unique SKU by appending a number if needed
func (s *productService) generateUniqueSKU(db *gorm.DB, baseSKU string, storeID uuid.UUID) string {
	sku := baseSKU
	counter := 1
	for {
		exists, err := s.repo.SKUExists(db, sku, storeID, nil)
		if err != nil {
			// If error, return the base with timestamp or something
			return baseSKU + "-" + fmt.Sprintf("%d", time.Now().Unix())
		}
		if !exists {
			return sku
		}
		sku = baseSKU + "-" + fmt.Sprintf("%d", counter)
		counter++
	}
}

// Generate a unique slug by appending a number if needed
func (s *productService) generateUniqueSlug(db *gorm.DB, baseSlug string, storeID uuid.UUID) string {
	slug := baseSlug
	counter := 1
	for {
		exists, err := s.repo.SlugExists(db, slug, storeID, nil)
		if err != nil {
			// If error, return the base with timestamp or something
			return baseSlug + "-" + fmt.Sprintf("%d", time.Now().Unix())
		}
		if !exists {
			return slug
		}
		slug = baseSlug + "-" + fmt.Sprintf("%d", counter)
		counter++
	}
}

// Crée un slug à partir du titre si aucun slug fourni
func resolveSlug(slug *string, title string) string {
	if slug != nil && *slug != "" {
		return *slug
	}
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(title), " ", "-"))
}

// Transforme un modèle Product en ProductResponse
func toProductResponse(p *models.Product) *dto.ProductResponse {
	resp := &dto.ProductResponse{
		ID:          p.ID,
		StoreID:     p.StoreID,
		CategoryID:  p.CategoryID,
		Title:       p.Title,
		Description: p.Description,
		Slug:        p.Slug,
		Status:      p.Status,
		Visibility:  p.Visibility,
		Price:       p.Price,
		SalePrice:   p.SalePrice,
		SaleStart:   p.SaleStart,
		SaleEnd:     p.SaleEnd,
		Currency:    p.Currency,
		SKU:         p.SKU,
		TrackStock:  p.TrackStock,
		Stock:       p.Stock,
		Weight:      p.Weight,
		Dimensions:  p.Dimensions,
		Brand:       p.Brand,
		TaxClass:    p.TaxClass,
		PublishedAt: p.PublishedAt,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
	if p.Category != nil {
		cat := toCategoryResponse(p.Category)
		resp.Category = &cat
	}
	if len(p.Collections) > 0 {
		resp.Collections = make([]dto.CollectionResponse, len(p.Collections))
		for i, collection := range p.Collections {
			resp.Collections[i] = toCollectionResponse(&collection)
		}
	}
	if len(p.Tags) > 0 {
		resp.Tags = make([]dto.TagResponse, len(p.Tags))
		for i, tag := range p.Tags {
			resp.Tags[i] = *toTagResponse(&tag)
		}
	}
	return resp
}

// Transforme Category en CategoryResponse
func toCategoryResponse(c *models.Category) dto.CategoryResponse {
	resp := dto.CategoryResponse{
		ID:          c.ID,
		StoreID:     c.StoreID,
		ParentID:    c.ParentID,
		Name:        c.Name,
		Slug:        c.Slug,
		Description: c.Description,
		Visibility:  c.Visibility,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
	resp.Children = make([]dto.CategoryResponse, len(c.Children))
	for i, ch := range c.Children {
		resp.Children[i] = toCategoryResponse(&ch)
	}
	return resp
}
