package services

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
)

// ProductSearchService définit les opérations de recherche et filtrage de produits
type ProductSearchService interface {
	// Search effectue une recherche complète avec filtres et pagination
	Search(db *gorm.DB, storeID uuid.UUID, filter dto.ProductSearchFilter) (*dto.SearchProductsResponse, error)

	// SearchByCategory retourne les produits avec filtre de catégorie
	SearchByCategory(db *gorm.DB, storeID, categoryID uuid.UUID, page, limit int) (*dto.SearchProductsResponse, error)

	// SearchByTags retourne les produits ayant les tags spécifiés
	SearchByTags(db *gorm.DB, storeID uuid.UUID, tagIDs []uuid.UUID, page, limit int) (*dto.SearchProductsResponse, error)

	// GetLowStockProducts retourne les produits avec stock faible
	GetLowStockProducts(db *gorm.DB, storeID uuid.UUID) ([]dto.ProductResponse, error)

	// BuildSearchIndex reconstruit l'index de recherche (FTS)
	BuildSearchIndex(db *gorm.DB, storeID uuid.UUID) error
}

type productSearchService struct {
	repo repo.ProductRepository
}

func NewProductSearchService(repo repo.ProductRepository) ProductSearchService {
	return &productSearchService{repo: repo}
}

func (s *productSearchService) Search(db *gorm.DB, storeID uuid.UUID, filter dto.ProductSearchFilter) (*dto.SearchProductsResponse, error) {
	// For now, delegate to the existing FindAll method
	// This is a simplified implementation - a full search service would need FTS
	productFilter := dto.ProductFilter{
		// Map fields as needed
	}

	products, err := s.repo.FindAll(db, storeID, productFilter)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	responses := make([]dto.ProductWithImagesResponse, len(products))
	for i, product := range products {
		responses[i] = dto.ProductWithImagesResponse{
			ProductResponse: *toProductResponse(&product),
			// Images would be populated here
		}
	}

	return &dto.SearchProductsResponse{
		Products: responses,
		Total:    int64(len(responses)),
		Page:     filter.Page,
		Limit:    filter.Limit,
		Pages:    1, // Simplified
	}, nil
}

func (s *productSearchService) SearchByCategory(db *gorm.DB, storeID, categoryID uuid.UUID, page, limit int) (*dto.SearchProductsResponse, error) {
	// TODO: Implement
	return &dto.SearchProductsResponse{}, nil
}

func (s *productSearchService) SearchByTags(db *gorm.DB, storeID uuid.UUID, tagIDs []uuid.UUID, page, limit int) (*dto.SearchProductsResponse, error) {
	// TODO: Implement
	return &dto.SearchProductsResponse{}, nil
}

func (s *productSearchService) GetLowStockProducts(db *gorm.DB, storeID uuid.UUID) ([]dto.ProductResponse, error) {
	// TODO: Implement
	return []dto.ProductResponse{}, nil
}

func (s *productSearchService) BuildSearchIndex(db *gorm.DB, storeID uuid.UUID) error {
	// TODO: Implement FTS index building
	return nil
}
