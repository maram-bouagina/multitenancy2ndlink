package services

import (
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/validation"
)

// ImageValidationService fournit les services de validation d'images
type ImageValidationService interface {
	// ValidateCreateImageRequest valide une requête de création d'image
	ValidateCreateImageRequest(req dto.CreateProductImageRequest, maxFileSizeMB int64) error

	// ValidateProductImageResponse valide une réponse d'image produit
	ValidateProductImageResponse(resp dto.ProductImageResponse, maxFileSizeMB int64) error
}

// imageValidationService implémente ImageValidationService
type imageValidationService struct {
	urlValidator *validation.ImageURLValidator
}

// NewImageValidationService crée une nouvelle instance du service de validation d'image
func NewImageValidationService() ImageValidationService {
	return &imageValidationService{
		urlValidator: validation.NewImageURLValidator(),
	}
}

// ValidateCreateImageRequest valide une requête de création d'image
func (s *imageValidationService) ValidateCreateImageRequest(req dto.CreateProductImageRequest, maxFileSizeMB int64) error {
	// Valider l'URL
	if err := s.urlValidator.ValidateImageURL(req.URL); err != nil {
		return err
	}

	// Valider le type de fichier
	if err := s.urlValidator.ValidateFileType(req.FileType); err != nil {
		return err
	}

	// Valider la taille du fichier
	if err := s.urlValidator.ValidateFileSize(req.FileSize, maxFileSizeMB); err != nil {
		return err
	}

	return nil
}

// ValidateProductImageResponse valide une réponse d'image produit
func (s *imageValidationService) ValidateProductImageResponse(resp dto.ProductImageResponse, maxFileSizeMB int64) error {
	// Valider l'URL principale
	if err := s.urlValidator.ValidateImageURL(resp.URL); err != nil {
		return err
	}

	// Valider les URLs responsives (thumbnails, medium, large)
	if resp.URLThumbnail != "" {
		if err := s.urlValidator.ValidateImageURL(resp.URLThumbnail); err != nil {
			return err
		}
	}

	if resp.URLMedium != "" {
		if err := s.urlValidator.ValidateImageURL(resp.URLMedium); err != nil {
			return err
		}
	}

	if resp.URLLarge != "" {
		if err := s.urlValidator.ValidateImageURL(resp.URLLarge); err != nil {
			return err
		}
	}

	// Valider le type de fichier
	if err := s.urlValidator.ValidateFileType(resp.FileType); err != nil {
		return err
	}

	// Valider la taille du fichier
	if err := s.urlValidator.ValidateFileSize(resp.FileSize, maxFileSizeMB); err != nil {
		return err
	}

	return nil
}
