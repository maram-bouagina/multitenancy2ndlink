package repo

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

type CollectionRepository interface {
	Create(col *models.Collection) error
	FindByID(id, storeID uuid.UUID) (*models.Collection, error)
	FindAll(storeID uuid.UUID) ([]models.Collection, error)
	Update(col *models.Collection) error
	Delete(id, storeID uuid.UUID) error
	AddProduct(collectionID, productID uuid.UUID) error
	RemoveProduct(collectionID, productID uuid.UUID) error
	FindProducts(col *models.Collection, storeID uuid.UUID, page, limit int) ([]models.Product, error)
	CountProducts(col *models.Collection, storeID uuid.UUID) (int64, error)
	SlugExists(slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error)
}

type collectionRepository struct {
	db *gorm.DB
}

func NewCollectionRepository(db *gorm.DB) CollectionRepository {
	return &collectionRepository{db: db}
}

func (r *collectionRepository) Create(col *models.Collection) error {
	return r.db.Create(col).Error
}

func (r *collectionRepository) FindByID(id, storeID uuid.UUID) (*models.Collection, error) {
	var col models.Collection
	err := r.db.Where("id = ? AND store_id = ?", id, storeID).First(&col).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &col, err
}

func (r *collectionRepository) FindAll(storeID uuid.UUID) ([]models.Collection, error) {
	var cols []models.Collection
	err := r.db.Where("store_id = ?", storeID).Order("name ASC").Find(&cols).Error
	return cols, err
}

func (r *collectionRepository) Update(col *models.Collection) error {
	return r.db.Save(col).Error
}

func (r *collectionRepository) Delete(id, storeID uuid.UUID) error {
	result := r.db.Where("id = ? AND store_id = ?", id, storeID).Delete(&models.Collection{})
	if result.RowsAffected == 0 {
		return errors.New("collection not found")
	}
	return result.Error
}

func (r *collectionRepository) AddProduct(collectionID, productID uuid.UUID) error {
	col := models.Collection{ID: collectionID}
	product := models.Product{ID: productID}
	return r.db.Model(&col).Association("Products").Append(&product)
}

func (r *collectionRepository) RemoveProduct(collectionID, productID uuid.UUID) error {
	col := models.Collection{ID: collectionID}
	product := models.Product{ID: productID}
	return r.db.Model(&col).Association("Products").Delete(&product)
}

func (r *collectionRepository) FindProducts(col *models.Collection, storeID uuid.UUID, page, limit int) ([]models.Product, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	var products []models.Product
	if col.Type == models.CollectionManual {
		err := r.db.
			Joins("JOIN collection_products cp ON cp.product_id = products.id").
			Where("cp.collection_id = ? AND products.store_id = ? AND products.deleted_at IS NULL", col.ID, storeID).
			Preload("Category").
			Order("products.created_at DESC").
			Limit(limit).Offset((page - 1) * limit).
			Find(&products).Error
		return products, err
	}
	query := r.db.Where("store_id = ? AND deleted_at IS NULL", storeID)
	if col.Rule != nil && *col.Rule != "" {
		filteredQuery, err := applyRules(query, *col.Rule)
		if err != nil {
			return nil, err
		}
		query = filteredQuery
	}
	err := query.
		Preload("Category").
		Order("created_at DESC").
		Limit(limit).Offset((page - 1) * limit).
		Find(&products).Error
	return products, err
}

func (r *collectionRepository) CountProducts(col *models.Collection, storeID uuid.UUID) (int64, error) {
	var total int64

	if col.Type == models.CollectionManual {
		err := r.db.Model(&models.Product{}).
			Joins("JOIN collection_products cp ON cp.product_id = products.id").
			Where("cp.collection_id = ? AND products.store_id = ? AND products.deleted_at IS NULL", col.ID, storeID).
			Count(&total).Error
		return total, err
	}

	query := r.db.Model(&models.Product{}).Where("store_id = ? AND deleted_at IS NULL", storeID)
	if col.Rule != nil && *col.Rule != "" {
		filteredQuery, err := applyRules(query, *col.Rule)
		if err != nil {
			return 0, err
		}
		query = filteredQuery
	}

	return total, query.Count(&total).Error
}

func (r *collectionRepository) SlugExists(slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := r.db.Model(&models.Collection{}).Where("slug = ? AND store_id = ?", slug, storeID)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}
	return count > 0, query.Count(&count).Error
}

func applyRules(query *gorm.DB, rule string) (*gorm.DB, error) {
	rule = strings.TrimSpace(rule)
	if rule == "" {
		return query, nil
	}

	re := regexp.MustCompile(`^(price|stock|status|visibility|brand)\s*(>=|<=|>|<|=)\s*(.+)$`)
	matches := re.FindStringSubmatch(rule)
	if len(matches) != 4 {
		return nil, fmt.Errorf("invalid rule format")
	}

	field := matches[1]
	operator := matches[2]
	rawValue := strings.TrimSpace(matches[3])

	switch field {
	case "price":
		value, err := strconv.ParseFloat(rawValue, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid price rule value")
		}
		return query.Where(field+" "+operator+" ?", value), nil
	case "stock":
		value, err := strconv.Atoi(rawValue)
		if err != nil {
			return nil, fmt.Errorf("invalid stock rule value")
		}
		return query.Where(field+" "+operator+" ?", value), nil
	case "status", "visibility", "brand":
		if operator != "=" {
			return nil, fmt.Errorf("operator %s not supported for %s", operator, field)
		}
		return query.Where(field+" = ?", rawValue), nil
	default:
		return nil, fmt.Errorf("unsupported rule field")
	}
}
