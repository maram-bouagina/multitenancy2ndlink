package repo

import (
	"errors"
	"multitenancypfe/internal/store/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PageRepository interface {
	Create(db *gorm.DB, page *models.StorefrontPage) error
	FindByStoreID(db *gorm.DB, storeID uuid.UUID) ([]models.StorefrontPage, error)
	FindPublishedByStoreID(db *gorm.DB, storeID uuid.UUID) ([]models.StorefrontPage, error)
	FindByID(db *gorm.DB, id, storeID uuid.UUID) (*models.StorefrontPage, error)
	FindBySlug(db *gorm.DB, slug string, storeID uuid.UUID) (*models.StorefrontPage, error)
	Update(db *gorm.DB, page *models.StorefrontPage) error
	Delete(db *gorm.DB, id uuid.UUID) error
}

type pageRepository struct{}

func NewPageRepository() PageRepository { return &pageRepository{} }

func (r *pageRepository) Create(db *gorm.DB, page *models.StorefrontPage) error {
	return db.Create(page).Error
}

func (r *pageRepository) FindByStoreID(db *gorm.DB, storeID uuid.UUID) ([]models.StorefrontPage, error) {
	var pages []models.StorefrontPage
	err := db.Where("store_id = ? AND deleted_at IS NULL", storeID).
		Order("created_at ASC").Find(&pages).Error
	return pages, err
}

func (r *pageRepository) FindPublishedByStoreID(db *gorm.DB, storeID uuid.UUID) ([]models.StorefrontPage, error) {
	var pages []models.StorefrontPage
	err := db.Where("store_id = ? AND status = 'published' AND deleted_at IS NULL", storeID).
		Order("created_at ASC").Find(&pages).Error
	return pages, err
}

func (r *pageRepository) FindByID(db *gorm.DB, id, storeID uuid.UUID) (*models.StorefrontPage, error) {
	var page models.StorefrontPage
	err := db.Where("id = ? AND store_id = ? AND deleted_at IS NULL", id, storeID).
		First(&page).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &page, err
}

func (r *pageRepository) FindBySlug(db *gorm.DB, slug string, storeID uuid.UUID) (*models.StorefrontPage, error) {
	var page models.StorefrontPage
	err := db.Where("slug = ? AND store_id = ? AND deleted_at IS NULL", slug, storeID).
		First(&page).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &page, err
}

func (r *pageRepository) Update(db *gorm.DB, page *models.StorefrontPage) error {
	return db.Save(page).Error
}

func (r *pageRepository) Delete(db *gorm.DB, id uuid.UUID) error {
	return db.Model(&models.StorefrontPage{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
