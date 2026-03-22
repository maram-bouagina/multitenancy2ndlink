package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateProductImageRequest représente une requête pour créer une image produit
type CreateProductImageRequest struct {
	URL          string  `json:"url" validate:"required"`
	URLThumbnail string  `json:"url_thumbnail" validate:"required"`
	URLMedium    string  `json:"url_medium" validate:"required"`
	URLLarge     string  `json:"url_large" validate:"required"`
	AltText      *string `json:"alt_text" validate:"omitempty,max=255"`
	Caption      *string `json:"caption" validate:"omitempty,max=500"`
	Position     int     `json:"position" validate:"min=0"`
	FileSize     int64   `json:"file_size" validate:"required,gt=0"`
	FileType     string  `json:"file_type" validate:"required,oneof=image/jpeg image/png image/webp"`
}

// UpdateProductImageRequest représente une requête pour mettre à jour une image produit
type UpdateProductImageRequest struct {
	AltText  *string `json:"alt_text" validate:"omitempty,max=255"`
	Caption  *string `json:"caption" validate:"omitempty,max=500"`
	Position *int    `json:"position" validate:"omitempty,min=0"`
}

// ProductImageResponse représente la réponse pour une image produit
type ProductImageResponse struct {
	ID           uuid.UUID `json:"id"`
	ProductID    uuid.UUID `json:"product_id"`
	URL          string    `json:"url"`
	URLThumbnail string    `json:"url_thumbnail"`
	URLMedium    string    `json:"url_medium"`
	URLLarge     string    `json:"url_large"`
	AltText      *string   `json:"alt_text,omitempty"`
	Caption      *string   `json:"caption,omitempty"`
	Position     int       `json:"position"`
	FileSize     int64     `json:"file_size"`
	FileType     string    `json:"file_type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ReorderImagesRequest représente une requête pour réordonner les images
type ReorderImagesRequest struct {
	Images []struct {
		ID       uuid.UUID `json:"id" validate:"required"`
		Position int       `json:"position" validate:"min=0"`
	} `json:"images" validate:"required,dive"`
}
