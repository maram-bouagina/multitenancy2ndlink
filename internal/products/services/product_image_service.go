package services

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/repo"
)

type ProductImageService interface {
	Create(storeID uuid.UUID, productID uuid.UUID, req dto.CreateProductImageRequest) (*dto.ProductImageResponse, error)
	GetByProductID(storeID uuid.UUID, productID uuid.UUID) (*[]dto.ProductImageResponse, error)
	Update(storeID uuid.UUID, productID uuid.UUID, imageID uuid.UUID, req dto.UpdateProductImageRequest) (*dto.ProductImageResponse, error)
	Delete(storeID uuid.UUID, productID uuid.UUID, imageID uuid.UUID) error
	Reorder(storeID uuid.UUID, productID uuid.UUID, imagePositions map[uuid.UUID]int) error
}

type productImageService struct {
	repo repo.ProductImageRepository
}

func NewProductImageService(repo repo.ProductImageRepository) ProductImageService {
	return &productImageService{repo: repo}
}

func (s *productImageService) Create(storeID uuid.UUID, productID uuid.UUID, req dto.CreateProductImageRequest) (*dto.ProductImageResponse, error) {
	image := &models.ProductImage{
		ID:           uuid.New(),
		ProductID:    productID,
		URL:          req.URL,
		URLThumbnail: req.URLThumbnail,
		URLMedium:    req.URLMedium,
		URLLarge:     req.URLLarge,
		AltText:      req.AltText,
		Caption:      req.Caption,
		Position:     req.Position,
		FileSize:     req.FileSize,
		FileType:     req.FileType,
	}

	if err := s.repo.Create(image); err != nil {
		return nil, fmt.Errorf("failed to create product image: %w", err)
	}

	return toProductImageResponse(image), nil
}

func (s *productImageService) GetByProductID(storeID uuid.UUID, productID uuid.UUID) (*[]dto.ProductImageResponse, error) {
	images, err := s.repo.GetByProductID(productID)
	if err != nil {
		return nil, fmt.Errorf("failed to get product images: %w", err)
	}

	responses := make([]dto.ProductImageResponse, 0, len(*images))
	for _, img := range *images {
		responses = append(responses, *toProductImageResponse(&img))
	}

	return &responses, nil
}

func (s *productImageService) Update(storeID uuid.UUID, productID uuid.UUID, imageID uuid.UUID, req dto.UpdateProductImageRequest) (*dto.ProductImageResponse, error) {
	image, err := s.repo.GetByID(imageID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("image not found")
		}
		return nil, fmt.Errorf("failed to get image: %w", err)
	}

	if image.ProductID != productID {
		return nil, fmt.Errorf("image does not belong to this product")
	}

	if req.AltText != nil {
		image.AltText = req.AltText
	}
	if req.Caption != nil {
		image.Caption = req.Caption
	}
	if req.Position != nil {
		image.Position = *req.Position
	}

	if err := s.repo.Update(image); err != nil {
		return nil, fmt.Errorf("failed to update image: %w", err)
	}

	return toProductImageResponse(image), nil
}

func (s *productImageService) Delete(storeID uuid.UUID, productID uuid.UUID, imageID uuid.UUID) error {
	image, err := s.repo.GetByID(imageID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("image not found")
		}
		return fmt.Errorf("failed to get image: %w", err)
	}

	if image.ProductID != productID {
		return fmt.Errorf("image does not belong to this product")
	}

	if err := s.repo.Delete(imageID); err != nil {
		return fmt.Errorf("failed to delete image: %w", err)
	}
	return nil
}

func (s *productImageService) Reorder(storeID uuid.UUID, productID uuid.UUID, imagePositions map[uuid.UUID]int) error {
	if err := s.repo.Reorder(productID, imagePositions); err != nil {
		return fmt.Errorf("failed to reorder images: %w", err)
	}
	return nil
}

func toProductImageResponse(img *models.ProductImage) *dto.ProductImageResponse {
	return &dto.ProductImageResponse{
		ID:           img.ID,
		ProductID:    img.ProductID,
		URL:          img.URL,
		URLThumbnail: img.URLThumbnail,
		URLMedium:    img.URLMedium,
		URLLarge:     img.URLLarge,
		AltText:      img.AltText,
		Caption:      img.Caption,
		Position:     img.Position,
		FileSize:     img.FileSize,
		FileType:     img.FileType,
		CreatedAt:    img.CreatedAt,
		UpdatedAt:    img.UpdatedAt,
	}
}
