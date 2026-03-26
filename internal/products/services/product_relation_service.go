package services

import (
	"errors"
	"fmt"

	"github.com/google/uuid"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

type ProductRelationService interface {
	GetByProduct(storeID uuid.UUID, productID uuid.UUID) (*dto.ProductRelationsResponse, error)
	ReplaceForProduct(storeID uuid.UUID, productID uuid.UUID, req dto.BulkProductRelationRequest) (*dto.ProductRelationsResponse, error)
}

type productRelationService struct {
	repo repo.ProductRelationRepository
}

func NewProductRelationService(repo repo.ProductRelationRepository) ProductRelationService {
	return &productRelationService{repo: repo}
}

func (s *productRelationService) GetByProduct(storeID uuid.UUID, productID uuid.UUID) (*dto.ProductRelationsResponse, error) {
	exists, err := s.repo.ProductExists(storeID, productID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("product not found")
	}

	relations, err := s.repo.ListBySourceProduct(storeID, productID)
	if err != nil {
		return nil, err
	}

	return toProductRelationsResponse(relations), nil
}

func (s *productRelationService) ReplaceForProduct(storeID uuid.UUID, productID uuid.UUID, req dto.BulkProductRelationRequest) (*dto.ProductRelationsResponse, error) {
	exists, err := s.repo.ProductExists(storeID, productID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("product not found")
	}

	validated := make([]models.ProductRelation, 0, len(req.Relations))
	seen := make(map[string]struct{}, len(req.Relations))

	for index, relation := range req.Relations {
		if relation.RelatedProductID == productID {
			return nil, errors.New("a product cannot be related to itself")
		}

		relatedExists, err := s.repo.ProductExists(storeID, relation.RelatedProductID)
		if err != nil {
			return nil, err
		}
		if !relatedExists {
			return nil, fmt.Errorf("related product %s not found", relation.RelatedProductID)
		}

		relationType, err := normalizeRelationType(relation.RelationType)
		if err != nil {
			return nil, err
		}

		key := string(relationType) + ":" + relation.RelatedProductID.String()
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		position := relation.Position
		if position < 0 {
			position = index
		}

		validated = append(validated, models.ProductRelation{
			ID:               uuid.New(),
			SourceProductID:  productID,
			RelatedProductID: relation.RelatedProductID,
			RelationType:     relationType,
			Position:         position,
		})
	}

	if err := s.repo.ReplaceForSourceProduct(storeID, productID, validated); err != nil {
		return nil, err
	}

	return s.GetByProduct(storeID, productID)
}

func normalizeRelationType(value string) (models.RelationType, error) {
	switch value {
	case string(models.RelationTypeUpsell):
		return models.RelationTypeUpsell, nil
	case string(models.RelationTypeCrossSell):
		return models.RelationTypeCrossSell, nil
	default:
		return "", errors.New("invalid relation type")
	}
}

func toProductRelationsResponse(relations []models.ProductRelation) *dto.ProductRelationsResponse {
	response := &dto.ProductRelationsResponse{
		UpsellProducts:    make([]dto.ProductRelationResponse, 0),
		CrossSellProducts: make([]dto.ProductRelationResponse, 0),
	}

	for _, relation := range relations {
		item := dto.ProductRelationResponse{
			ID:               relation.ID,
			SourceProductID:  relation.SourceProductID,
			RelatedProductID: relation.RelatedProductID,
			RelationType:     string(relation.RelationType),
			Position:         relation.Position,
		}
		if relation.RelatedProduct != nil {
			item.RelatedProduct = toProductResponse(relation.RelatedProduct)
		}

		switch relation.RelationType {
		case models.RelationTypeUpsell:
			response.UpsellProducts = append(response.UpsellProducts, item)
		case models.RelationTypeCrossSell:
			response.CrossSellProducts = append(response.CrossSellProducts, item)
		}
	}

	return response
}
