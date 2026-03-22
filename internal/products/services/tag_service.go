package services

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

type TagService interface {
	Create(storeID uuid.UUID, req dto.CreateTagRequest) (*dto.TagResponse, error)
	GetAll(storeID uuid.UUID) (*[]dto.TagResponse, error)
	GetByID(id uuid.UUID, storeID uuid.UUID) (*dto.TagResponse, error)
	Update(id uuid.UUID, storeID uuid.UUID, req dto.UpdateTagRequest) (*dto.TagResponse, error)
	Delete(id uuid.UUID, storeID uuid.UUID) error
	AssignToProduct(storeID uuid.UUID, productID uuid.UUID, tagIDs []uuid.UUID) error
}

type tagService struct {
	repo repo.TagRepository
}

func NewTagService(repo repo.TagRepository) TagService {
	return &tagService{repo: repo}
}

func (s *tagService) Create(storeID uuid.UUID, req dto.CreateTagRequest) (*dto.TagResponse, error) {
	tag := &models.Tag{
		ID:      uuid.New(),
		StoreID: storeID,
		Name:    req.Name,
		Slug:    req.Slug,
		Color:   req.Color,
	}

	if err := s.repo.Create(tag); err != nil {
		return nil, fmt.Errorf("failed to create tag: %w", err)
	}

	return toTagResponse(tag), nil
}

func (s *tagService) GetAll(storeID uuid.UUID) (*[]dto.TagResponse, error) {
	tags, err := s.repo.GetByStoreID(storeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	responses := make([]dto.TagResponse, 0, len(*tags))
	for _, tag := range *tags {
		responses = append(responses, *toTagResponse(&tag))
	}

	return &responses, nil
}

func (s *tagService) GetByID(id uuid.UUID, storeID uuid.UUID) (*dto.TagResponse, error) {
	tag, err := s.repo.GetByID(id, storeID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("tag not found")
		}
		return nil, fmt.Errorf("failed to get tag: %w", err)
	}

	return toTagResponse(tag), nil
}

func (s *tagService) Update(id uuid.UUID, storeID uuid.UUID, req dto.UpdateTagRequest) (*dto.TagResponse, error) {
	tag, err := s.repo.GetByID(id, storeID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("tag not found")
		}
		return nil, fmt.Errorf("failed to get tag: %w", err)
	}

	if req.Name != nil {
		tag.Name = *req.Name
	}
	if req.Slug != nil {
		tag.Slug = *req.Slug
	}
	if req.Color != nil {
		tag.Color = req.Color
	}

	if err := s.repo.Update(tag); err != nil {
		return nil, fmt.Errorf("failed to update tag: %w", err)
	}

	return toTagResponse(tag), nil
}

func (s *tagService) Delete(id uuid.UUID, storeID uuid.UUID) error {
	if err := s.repo.Delete(id, storeID); err != nil {
		return fmt.Errorf("failed to delete tag: %w", err)
	}
	return nil
}

func (s *tagService) AssignToProduct(storeID uuid.UUID, productID uuid.UUID, tagIDs []uuid.UUID) error {
	// Call repository to assign tags
	if err := s.repo.AssignToProduct(storeID, productID, tagIDs); err != nil {
		return fmt.Errorf("failed to assign tags to product: %w", err)
	}
	return nil
}

func toTagResponse(tag *models.Tag) *dto.TagResponse {
	return &dto.TagResponse{
		ID:        tag.ID,
		StoreID:   tag.StoreID,
		Name:      tag.Name,
		Slug:      tag.Slug,
		Color:     tag.Color,
		CreatedAt: tag.CreatedAt,
		UpdatedAt: tag.UpdatedAt,
	}
}
