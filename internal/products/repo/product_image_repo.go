package repo

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

type ProductImageRepository interface {
	Create(image *models.ProductImage) error
	GetByID(id uuid.UUID) (*models.ProductImage, error)
	GetByProductID(productID uuid.UUID) (*[]models.ProductImage, error)
	Update(image *models.ProductImage) error
	Delete(id uuid.UUID) error
	Reorder(productID uuid.UUID, imagePositions map[uuid.UUID]int) error
}

type productImageRepository struct {
	db *gorm.DB
}

func NewProductImageRepository(db *gorm.DB) ProductImageRepository {
	return &productImageRepository{db: db}
}

func (r *productImageRepository) Create(image *models.ProductImage) error {
	return r.db.Create(image).Error
}

func (r *productImageRepository) GetByID(id uuid.UUID) (*models.ProductImage, error) {
	var image models.ProductImage
	if err := r.db.Where("id = ?", id).First(&image).Error; err != nil {
		return nil, err
	}
	return &image, nil
}

func (r *productImageRepository) GetByProductID(productID uuid.UUID) (*[]models.ProductImage, error) {
	var images []models.ProductImage
	if err := r.db.Where("product_id = ?", productID).Order("position ASC").Find(&images).Error; err != nil {
		return nil, err
	}
	return &images, nil
}

func (r *productImageRepository) Update(image *models.ProductImage) error {
	return r.db.Save(image).Error
}

func (r *productImageRepository) Delete(id uuid.UUID) error {
	return r.db.Where("id = ?", id).Delete(&models.ProductImage{}).Error
}

func (r *productImageRepository) Reorder(productID uuid.UUID, imagePositions map[uuid.UUID]int) error {
	for imageID, position := range imagePositions {
		if err := r.db.Model(&models.ProductImage{}).Where("id = ?", imageID).Update("position", position).Error; err != nil {
			return err
		}
	}
	return nil
}
