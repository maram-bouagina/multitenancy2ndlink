package dto

import (
	"time"

	"github.com/google/uuid"

	"multitenancypfe/internal/products/models"
)

type CreateCollectionRequest struct {
	Name string                `json:"name" validate:"required,min=1,max=255"`
	Slug *string               `json:"slug"`
	Type models.CollectionType `json:"type" validate:"required,oneof=manual automatic"`
	Rule *string               `json:"rule"`
}

type UpdateCollectionRequest struct {
	Name *string                `json:"name" validate:"omitempty,min=1,max=255"`
	Slug *string                `json:"slug"`
	Type *models.CollectionType `json:"type" validate:"omitempty,oneof=manual automatic"`
	Rule *string                `json:"rule"`
}

type CollectionResponse struct {
	ID        uuid.UUID             `json:"id"`
	StoreID   uuid.UUID             `json:"store_id"`
	Name      string                `json:"name"`
	Slug      string                `json:"slug"`
	Type      models.CollectionType `json:"type"`
	Rule      *string               `json:"rule,omitempty"`
	CreatedAt time.Time             `json:"created_at"`
	UpdatedAt time.Time             `json:"updated_at"`
}

type CollectionWithProductsResponse struct {
	CollectionResponse
	Products []ProductResponse `json:"products"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
	Pages    int               `json:"pages"`
}
