package dto

import (
	"time"

	"github.com/google/uuid"

	"multitenancypfe/internal/products/models"
)

type CreateCollectionRequest struct {
	Name            string                `json:"name" validate:"required,min=1,max=255"`
	Slug            *string               `json:"slug"`
	Type            models.CollectionType `json:"type" validate:"required,oneof=manual automatic"`
	Rule            *string               `json:"rule"`
	Description     *string               `json:"description"`
	MetaTitle       *string               `json:"meta_title"`
	MetaDescription *string               `json:"meta_description"`
	CanonicalURL    *string               `json:"canonical_url" validate:"omitempty,url"`
	Noindex         bool                  `json:"noindex"`
	ImageURL        *string               `json:"image_url" validate:"omitempty,url"`
}

type UpdateCollectionRequest struct {
	Name            *string                `json:"name" validate:"omitempty,min=1,max=255"`
	Slug            *string                `json:"slug"`
	Type            *models.CollectionType `json:"type" validate:"omitempty,oneof=manual automatic"`
	Rule            *string                `json:"rule"`
	Description     *string                `json:"description"`
	MetaTitle       *string                `json:"meta_title"`
	MetaDescription *string                `json:"meta_description"`
	CanonicalURL    *string                `json:"canonical_url" validate:"omitempty,url"`
	Noindex         *bool                  `json:"noindex"`
	ImageURL        *string                `json:"image_url" validate:"omitempty,url"`
}

type CollectionResponse struct {
	ID              uuid.UUID             `json:"id"`
	StoreID         uuid.UUID             `json:"store_id"`
	Name            string                `json:"name"`
	Slug            string                `json:"slug"`
	Type            models.CollectionType `json:"type"`
	Rule            *string               `json:"rule,omitempty"`
	Description     *string               `json:"description,omitempty"`
	MetaTitle       *string               `json:"meta_title,omitempty"`
	MetaDescription *string               `json:"meta_description,omitempty"`
	CanonicalURL    *string               `json:"canonical_url,omitempty"`
	Noindex         bool                  `json:"noindex"`
	ImageURL        *string               `json:"image_url,omitempty"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
}

type CollectionWithProductsResponse struct {
	CollectionResponse
	Products []ProductResponse `json:"products"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
	Pages    int               `json:"pages"`
}
