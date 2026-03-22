package services

import (
	"errors"

	"github.com/google/uuid"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

type CollectionService interface {
	Create(storeID uuid.UUID, req dto.CreateCollectionRequest) (*dto.CollectionResponse, error)
	GetByID(id, storeID uuid.UUID) (*dto.CollectionResponse, error)
	GetAll(storeID uuid.UUID) ([]dto.CollectionResponse, error)
	Update(id, storeID uuid.UUID, req dto.UpdateCollectionRequest) (*dto.CollectionResponse, error)
	Delete(id, storeID uuid.UUID) error
	AddProduct(collectionID, productID, storeID uuid.UUID) error
	RemoveProduct(collectionID, productID, storeID uuid.UUID) error
	GetProducts(collectionID, storeID uuid.UUID, page, limit int) (*dto.CollectionWithProductsResponse, error)
}

type collectionService struct {
	repo repo.CollectionRepository
}

func NewCollectionService(r repo.CollectionRepository) CollectionService {
	return &collectionService{repo: r}
}

func (s *collectionService) Create(storeID uuid.UUID, req dto.CreateCollectionRequest) (*dto.CollectionResponse, error) {
	slug := resolveSlug(req.Slug, req.Name)

	exists, err := s.repo.SlugExists(slug, storeID, nil)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("slug already in use")
	}
	if req.Type == models.CollectionAutomatic && (req.Rule == nil || *req.Rule == "") {
		return nil, errors.New("automatic collection requires a rule")
	}

	// Validate rule syntax for automatic collections
	if req.Type == models.CollectionAutomatic && req.Rule != nil && *req.Rule != "" {
		ruleEngine := NewCollectionRuleEngine()
		if err := ruleEngine.ValidateRule(*req.Rule); err != nil {
			return nil, err
		}
	}

	col := &models.Collection{
		StoreID: storeID,
		Name:    req.Name,
		Slug:    slug,
		Type:    req.Type,
		Rule:    req.Rule,
	}
	if err := s.repo.Create(col); err != nil {
		return nil, err
	}
	resp := toCollectionResponse(col)
	return &resp, nil
}

func (s *collectionService) GetByID(id, storeID uuid.UUID) (*dto.CollectionResponse, error) {
	col, err := s.findOrFail(id, storeID)
	if err != nil {
		return nil, err
	}
	resp := toCollectionResponse(col)
	return &resp, nil
}

func (s *collectionService) GetAll(storeID uuid.UUID) ([]dto.CollectionResponse, error) {
	cols, err := s.repo.FindAll(storeID)
	if err != nil {
		return nil, err
	}
	result := make([]dto.CollectionResponse, len(cols))
	for i, c := range cols {
		result[i] = toCollectionResponse(&c)
	}
	return result, nil
}

func (s *collectionService) Update(id, storeID uuid.UUID, req dto.UpdateCollectionRequest) (*dto.CollectionResponse, error) {
	col, err := s.findOrFail(id, storeID)
	if err != nil {
		return nil, err
	}

	if req.Slug != nil {
		exists, err := s.repo.SlugExists(*req.Slug, storeID, &id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("slug already in use")
		}
		col.Slug = *req.Slug
	}

	if req.Name != nil {
		col.Name = *req.Name
	}
	if req.Type != nil {
		col.Type = *req.Type
	}
	if req.Rule != nil {
		col.Rule = req.Rule
	}

	if col.Type == models.CollectionAutomatic && (col.Rule == nil || *col.Rule == "") {
		return nil, errors.New("automatic collection requires a rule")
	}

	// Validate rule syntax for automatic collections
	if col.Type == models.CollectionAutomatic && col.Rule != nil && *col.Rule != "" {
		ruleEngine := NewCollectionRuleEngine()
		if err := ruleEngine.ValidateRule(*col.Rule); err != nil {
			return nil, err
		}
	}

	if err := s.repo.Update(col); err != nil {
		return nil, err
	}
	resp := toCollectionResponse(col)
	return &resp, nil
}

func (s *collectionService) Delete(id, storeID uuid.UUID) error {
	if _, err := s.findOrFail(id, storeID); err != nil {
		return err
	}
	return s.repo.Delete(id, storeID)
}

func (s *collectionService) AddProduct(collectionID, productID, storeID uuid.UUID) error {
	if _, err := s.findOrFail(collectionID, storeID); err != nil {
		return err
	}
	return s.repo.AddProduct(collectionID, productID)
}

func (s *collectionService) RemoveProduct(collectionID, productID, storeID uuid.UUID) error {
	if _, err := s.findOrFail(collectionID, storeID); err != nil {
		return err
	}
	return s.repo.RemoveProduct(collectionID, productID)
}

func (s *collectionService) GetProducts(collectionID, storeID uuid.UUID, page, limit int) (*dto.CollectionWithProductsResponse, error) {
	col, err := s.findOrFail(collectionID, storeID)
	if err != nil {
		return nil, err
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	products, err := s.repo.FindProducts(col, storeID, page, limit)
	if err != nil {
		return nil, err
	}

	total, err := s.repo.CountProducts(col, storeID)
	if err != nil {
		return nil, err
	}

	productResponses := make([]dto.ProductResponse, len(products))
	for i, p := range products {
		productResponses[i] = *toProductResponse(&p)
	}

	pages := 1
	if limit > 0 {
		pages = int((total + int64(limit) - 1) / int64(limit))
		if pages < 1 {
			pages = 1
		}
	}

	return &dto.CollectionWithProductsResponse{
		CollectionResponse: toCollectionResponse(col),
		Products:           productResponses,
		Total:              total,
		Page:               page,
		Limit:              limit,
		Pages:              pages,
	}, nil
}

func (s *collectionService) findOrFail(id, storeID uuid.UUID) (*models.Collection, error) {
	col, err := s.repo.FindByID(id, storeID)
	if err != nil {
		return nil, err
	}
	if col == nil {
		return nil, errors.New("collection not found")
	}
	return col, nil
}

func toCollectionResponse(c *models.Collection) dto.CollectionResponse {
	return dto.CollectionResponse{
		ID:        c.ID,
		StoreID:   c.StoreID,
		Name:      c.Name,
		Slug:      c.Slug,
		Type:      c.Type,
		Rule:      c.Rule,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}
