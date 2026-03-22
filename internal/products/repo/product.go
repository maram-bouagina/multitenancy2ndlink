package repo

import (
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
)

// Interface du repository pour gérer les produits
type ProductRepository interface {
	Create(db *gorm.DB, product *models.Product) error
	FindByID(db *gorm.DB, id, storeID uuid.UUID) (*models.Product, error)
	FindAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) ([]models.Product, error)
	CountAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) (int64, error)
	FindAllForExport(db *gorm.DB, storeID uuid.UUID) ([]models.Product, error)
	Update(db *gorm.DB, product *models.Product) error
	Delete(db *gorm.DB, id, storeID uuid.UUID) error
	SlugExists(db *gorm.DB, slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error)
	SKUExists(db *gorm.DB, sku string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error)
	GetTotalReservedStock(db *gorm.DB, productID uuid.UUID) (int, error)
	CreateReservation(db *gorm.DB, reservation *models.StockReservation) error
	UserHasReservation(db *gorm.DB, productID, userID uuid.UUID) (bool, error)
}

type productRepository struct {
}

// Création d'un nouveau repository
func NewProductRepository() ProductRepository {
	return &productRepository{}
}

// Crée un produit en base
func (r *productRepository) Create(db *gorm.DB, product *models.Product) error {
	return db.Create(product).Error
}

// Cherche un produit par son ID et storeID
func (r *productRepository) FindByID(db *gorm.DB, id, storeID uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := db.Preload("Category").
		Preload("Collections").
		Preload("Tags", "deleted_at IS NULL").
		Where("id = ? AND store_id = ? AND deleted_at IS NULL", id, storeID).
		First(&product).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &product, err
}

// Liste tous les produits avec filtres (status, visibilité, marque, recherche texte)
func (r *productRepository) FindAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) ([]models.Product, error) {
	var products []models.Product
	query := db.Where("store_id = ? AND deleted_at IS NULL", storeID)

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Visibility != "" {
		query = query.Where("visibility = ?", filter.Visibility)
	}
	if filter.Brand != "" {
		query = query.Where("brand = ?", filter.Brand)
	}
	if filter.Search != "" {
		query = query.Where("title ILIKE ?", "%"+strings.TrimSpace(filter.Search)+"%")
	}
	if filter.CategoryID != "" {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.PriceMin != nil {
		query = query.Where("price >= ?", *filter.PriceMin)
	}
	if filter.PriceMax != nil {
		query = query.Where("price <= ?", *filter.PriceMax)
	}
	if filter.InStock != nil {
		if *filter.InStock {
			query = query.Where("stock > 0")
		} else {
			query = query.Where("stock <= 0")
		}
	}

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	orderBy := "created_at DESC"
	switch filter.SortBy {
	case "price_asc":
		orderBy = "price ASC"
	case "price_desc":
		orderBy = "price DESC"
	case "oldest":
		orderBy = "created_at ASC"
	}

	err := query.Order(orderBy).
		Limit(filter.Limit).
		Offset((filter.Page - 1) * filter.Limit).
		Find(&products).Error

	return products, err
}

// CountAll retourne le nombre total de produits correspondant aux filtres
func (r *productRepository) CountAll(db *gorm.DB, storeID uuid.UUID, filter dto.ProductFilter) (int64, error) {
	var total int64
	query := db.Model(&models.Product{}).Where("store_id = ? AND deleted_at IS NULL", storeID)

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Visibility != "" {
		query = query.Where("visibility = ?", filter.Visibility)
	}
	if filter.Brand != "" {
		query = query.Where("brand = ?", filter.Brand)
	}
	if filter.Search != "" {
		query = query.Where("title ILIKE ?", "%"+strings.TrimSpace(filter.Search)+"%")
	}
	if filter.CategoryID != "" {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.PriceMin != nil {
		query = query.Where("price >= ?", *filter.PriceMin)
	}
	if filter.PriceMax != nil {
		query = query.Where("price <= ?", *filter.PriceMax)
	}
	if filter.InStock != nil {
		if *filter.InStock {
			query = query.Where("stock > 0")
		} else {
			query = query.Where("stock <= 0")
		}
	}

	err := query.Count(&total).Error
	return total, err
}

// FindAllForExport retourne tous les produits sans pagination (pour export CSV/Excel)
func (r *productRepository) FindAllForExport(db *gorm.DB, storeID uuid.UUID) ([]models.Product, error) {
	var products []models.Product
	err := db.Where("store_id = ? AND deleted_at IS NULL", storeID).
		Order("created_at DESC").
		Find(&products).Error
	return products, err
}

// Met à jour un produit
func (r *productRepository) Update(db *gorm.DB, product *models.Product) error {
	return db.Save(product).Error
}

// Supprime un produit (soft delete)
func (r *productRepository) Delete(db *gorm.DB, id, storeID uuid.UUID) error {
	result := db.Model(&models.Product{}).
		Where("id = ? AND store_id = ? AND deleted_at IS NULL", id, storeID).
		Update("deleted_at", gorm.Expr("NOW()"))
	if result.RowsAffected == 0 {
		return errors.New("product not found")
	}
	return result.Error
}

// Vérifie si un slug existe déjà
func (r *productRepository) SlugExists(db *gorm.DB, slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := db.Model(&models.Product{}).
		Where("slug = ? AND store_id = ? AND deleted_at IS NULL", slug, storeID)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}

// Vérifie si un SKU existe déjà pour ce store
func (r *productRepository) SKUExists(db *gorm.DB, sku string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := db.Model(&models.Product{}).
		Where("sku = ? AND store_id = ? AND deleted_at IS NULL", sku, storeID)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}

// GetTotalReservedStock calculates the sum of unreleased reservations for a product
func (r *productRepository) GetTotalReservedStock(db *gorm.DB, productID uuid.UUID) (int, error) {
	var total int
	err := db.Model(&models.StockReservation{}).
		Where("product_id = ? AND released_at IS NULL", productID).
		Select("COALESCE(SUM(quantity), 0)").
		Row().
		Scan(&total)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}
	return total, nil
}

// CreateReservation creates a new stock reservation
func (r *productRepository) CreateReservation(db *gorm.DB, reservation *models.StockReservation) error {
	return db.Create(reservation).Error
}

// UserHasReservation checks if a user already has an active reservation for a product
func (r *productRepository) UserHasReservation(db *gorm.DB, productID, userID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&models.StockReservation{}).
		Where("product_id = ? AND user_id = ? AND released_at IS NULL AND expires_at > NOW()", productID, userID).
		Count(&count).Error
	return count > 0, err
}
