package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/store/models"
)

type StoreRepository interface {
	Create(store *models.Store) error
	FindByID(id uuid.UUID) (*models.Store, error)
	FindByTenantID(tenantID uuid.UUID) ([]models.Store, error)
	FindBySlug(slug string) (*models.Store, error)
	Update(store *models.Store) error
	Delete(id uuid.UUID) error
}

type storeRepository struct {
	db *gorm.DB
}

func NewStoreRepository(db *gorm.DB) StoreRepository {
	return &storeRepository{db: db}
}

func (r *storeRepository) Create(store *models.Store) error {
	return r.db.Create(store).Error
}

func (r *storeRepository) FindByID(id uuid.UUID) (*models.Store, error) {
	var store models.Store
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&store).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &store, err
}

func (r *storeRepository) FindByTenantID(tenantID uuid.UUID) ([]models.Store, error) {
	var stores []models.Store
	err := r.db.Where("tenant_id = ? AND deleted_at IS NULL", tenantID).Find(&stores).Error
	return stores, err
}

func (r *storeRepository) FindBySlug(slug string) (*models.Store, error) {
	var store models.Store
	err := r.db.Where("slug = ? AND deleted_at IS NULL", slug).First(&store).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &store, err
}

func (r *storeRepository) Update(store *models.Store) error {
	return r.db.Save(store).Error
}

func (r *storeRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.Store{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
