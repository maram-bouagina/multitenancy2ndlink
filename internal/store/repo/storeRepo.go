package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/store/models"
)

type StoreRepository interface {
	Create(db *gorm.DB, store *models.Store) error
	FindByID(db *gorm.DB, id uuid.UUID) (*models.Store, error)
	FindByTenantID(db *gorm.DB, tenantID string) ([]models.Store, error)
	FindBySlug(db *gorm.DB, slug string) (*models.Store, error)
	Update(db *gorm.DB, store *models.Store) error
	Delete(db *gorm.DB, id uuid.UUID) error
}

type storeRepository struct {
}

func NewStoreRepository() StoreRepository {
	return &storeRepository{}
}

func (r *storeRepository) Create(db *gorm.DB, store *models.Store) error {
	return db.Create(store).Error
}

func (r *storeRepository) FindByID(db *gorm.DB, id uuid.UUID) (*models.Store, error) {
	var store models.Store
	err := db.Where("id = ? AND deleted_at IS NULL", id).First(&store).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &store, err
}

func (r *storeRepository) FindByTenantID(db *gorm.DB, tenantID string) ([]models.Store, error) {
	var stores []models.Store
	err := db.Where("tenant_id = ? AND deleted_at IS NULL", tenantID).Find(&stores).Error
	return stores, err
}

func (r *storeRepository) FindBySlug(db *gorm.DB, slug string) (*models.Store, error) {
	var store models.Store
	err := db.Where("slug = ? AND deleted_at IS NULL", slug).First(&store).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &store, err
}

func (r *storeRepository) Update(db *gorm.DB, store *models.Store) error {
	return db.Save(store).Error
}

func (r *storeRepository) Delete(db *gorm.DB, id uuid.UUID) error {
	return db.Model(&models.Store{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
