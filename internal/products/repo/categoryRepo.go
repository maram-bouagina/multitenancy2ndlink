package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

type CategoryRepository interface {
	Create(c *models.Category) error
	FindByID(id, storeID uuid.UUID) (*models.Category, error)
	FindRoots(storeID uuid.UUID) ([]*models.Category, error)
	Update(c *models.Category) error
	Delete(id, storeID uuid.UUID) error
	HasProducts(id uuid.UUID) (bool, error)
	SlugExists(slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error)
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(c *models.Category) error {
	return r.db.Create(c).Error
}

// category mou3yna m3a children mta3ha w parents
func (r *categoryRepository) FindByID(id, storeID uuid.UUID) (*models.Category, error) {
	var c models.Category
	err := r.db.Preload("Children").
		Where("id = ? AND store_id = ?", id, storeID).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &c, err
}

//til9a parents lkl w direct children  mta3hm

func (r *categoryRepository) FindRoots(storeID uuid.UUID) ([]*models.Category, error) {
	var cats []*models.Category
	err := r.db.Preload("Children").
		Where("store_id = ? AND parent_id IS NULL", storeID).
		Order("name ASC").
		Find(&cats).Error
	return cats, err
}

func (r *categoryRepository) Update(c *models.Category) error {
	return r.db.Save(c).Error
}

func (r *categoryRepository) Delete(id, storeID uuid.UUID) error {
	result := r.db.Where("id = ? AND store_id = ?", id, storeID).Delete(&models.Category{})
	if result.RowsAffected == 0 {
		return errors.New("category not found")
	}
	return result.Error
}

func (r *categoryRepository) HasProducts(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Product{}).
		Where("category_id = ? AND deleted_at IS NULL", id).
		Count(&count).Error
	return count > 0, err
}

func (r *categoryRepository) SlugExists(slug string, storeID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	var count int64
	query := r.db.Model(&models.Category{}).Where("slug = ? AND store_id = ?", slug, storeID)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}
	return count > 0, query.Count(&count).Error
}
