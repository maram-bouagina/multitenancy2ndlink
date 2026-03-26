package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/models"
)

type ProductRelationRepository interface {
	ProductExists(storeID uuid.UUID, productID uuid.UUID) (bool, error)
	ListBySourceProduct(storeID uuid.UUID, productID uuid.UUID) ([]models.ProductRelation, error)
	ReplaceForSourceProduct(storeID uuid.UUID, productID uuid.UUID, relations []models.ProductRelation) error
	ListPublicRelatedProducts(storeID uuid.UUID, productID uuid.UUID, limitPerType int) ([]models.Product, []models.Product, error)
}

type productRelationRepository struct {
	db *gorm.DB
}

func NewProductRelationRepository(db *gorm.DB) ProductRelationRepository {
	return &productRelationRepository{db: db}
}

func (r *productRelationRepository) ProductExists(storeID uuid.UUID, productID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Product{}).
		Where("id = ? AND store_id = ? AND deleted_at IS NULL", productID, storeID).
		Count(&count).Error
	return count > 0, err
}

func (r *productRelationRepository) ListBySourceProduct(storeID uuid.UUID, productID uuid.UUID) ([]models.ProductRelation, error) {
	var relations []models.ProductRelation
	err := r.db.
		Model(&models.ProductRelation{}).
		Joins("JOIN products source ON source.id = product_relations.source_product_id AND source.deleted_at IS NULL").
		Where("source.store_id = ? AND product_relations.source_product_id = ?", storeID, productID).
		Preload("RelatedProduct", func(db *gorm.DB) *gorm.DB {
			return db.
				Where("store_id = ? AND deleted_at IS NULL", storeID).
				Preload("Category").
				Preload("Collections").
				Preload("Tags", "deleted_at IS NULL")
		}).
		Order("CASE product_relations.relation_type WHEN 'upsell' THEN 0 ELSE 1 END").
		Order("product_relations.position ASC").
		Order("product_relations.created_at ASC").
		Find(&relations).Error
	if err != nil {
		return nil, err
	}

	filtered := make([]models.ProductRelation, 0, len(relations))
	for _, relation := range relations {
		if relation.RelatedProduct == nil {
			continue
		}
		filtered = append(filtered, relation)
	}

	return filtered, nil
}

func (r *productRelationRepository) ReplaceForSourceProduct(storeID uuid.UUID, productID uuid.UUID, relations []models.ProductRelation) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var source models.Product
		if err := tx.Where("id = ? AND store_id = ? AND deleted_at IS NULL", productID, storeID).First(&source).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("product not found")
			}
			return err
		}

		if err := tx.Where("source_product_id = ?", productID).Delete(&models.ProductRelation{}).Error; err != nil {
			return err
		}

		if len(relations) == 0 {
			return nil
		}

		return tx.Create(&relations).Error
	})
}

func (r *productRelationRepository) ListPublicRelatedProducts(storeID uuid.UUID, productID uuid.UUID, limitPerType int) ([]models.Product, []models.Product, error) {
	var relations []models.ProductRelation
	err := r.db.
		Model(&models.ProductRelation{}).
		Joins("JOIN products source ON source.id = product_relations.source_product_id AND source.deleted_at IS NULL").
		Where("source.store_id = ? AND product_relations.source_product_id = ?", storeID, productID).
		Preload("RelatedProduct", func(db *gorm.DB) *gorm.DB {
			return db.
				Where("store_id = ? AND status = ? AND visibility = ? AND deleted_at IS NULL", storeID, models.StatusPublished, models.VisibilityPublic).
				Preload("Category").
				Preload("Collections")
		}).
		Order("product_relations.position ASC").
		Order("product_relations.created_at ASC").
		Find(&relations).Error
	if err != nil {
		return nil, nil, err
	}

	upsell := make([]models.Product, 0, limitPerType)
	crossSell := make([]models.Product, 0, limitPerType)
	for _, relation := range relations {
		if relation.RelatedProduct == nil {
			continue
		}

		switch relation.RelationType {
		case models.RelationTypeUpsell:
			if len(upsell) < limitPerType {
				upsell = append(upsell, *relation.RelatedProduct)
			}
		case models.RelationTypeCrossSell:
			if len(crossSell) < limitPerType {
				crossSell = append(crossSell, *relation.RelatedProduct)
			}
		}
	}

	return upsell, crossSell, nil
}
