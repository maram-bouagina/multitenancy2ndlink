package repo

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

type TagRepository interface {
	Create(tag *models.Tag) error
	GetByID(id, storeID uuid.UUID) (*models.Tag, error)
	GetByStoreID(storeID uuid.UUID) (*[]models.Tag, error)
	Update(tag *models.Tag) error
	Delete(id, storeID uuid.UUID) error
	AssignToProduct(storeID uuid.UUID, productID uuid.UUID, tagIDs []uuid.UUID) error
}

type tagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) TagRepository {
	return &tagRepository{db: db}
}

func (r *tagRepository) Create(tag *models.Tag) error {
	return r.db.Create(tag).Error
}

func (r *tagRepository) GetByID(id, storeID uuid.UUID) (*models.Tag, error) {
	var tag models.Tag
	if err := r.db.Where("id = ? AND store_id = ?", id, storeID).First(&tag).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *tagRepository) GetByStoreID(storeID uuid.UUID) (*[]models.Tag, error) {
	var tags []models.Tag
	if err := r.db.Where("store_id = ?", storeID).Find(&tags).Error; err != nil {
		return nil, err
	}
	return &tags, nil
}

func (r *tagRepository) Update(tag *models.Tag) error {
	return r.db.Save(tag).Error
}

func (r *tagRepository) Delete(id, storeID uuid.UUID) error {
	return r.db.Where("id = ? AND store_id = ?", id, storeID).Delete(&models.Tag{}).Error
}

func (r *tagRepository) AssignToProduct(storeID uuid.UUID, productID uuid.UUID, tagIDs []uuid.UUID) error {
	// First delete existing product tags
	if err := r.db.Where("product_id = ?", productID).Delete(&models.ProductTag{}).Error; err != nil {
		return err
	}

	// Then insert new product tags
	for _, tagID := range tagIDs {
		pt := &models.ProductTag{
			ID:        uuid.New(),
			ProductID: productID,
			TagID:     tagID,
		}
		if err := r.db.Create(pt).Error; err != nil {
			return err
		}
	}

	return nil
}
