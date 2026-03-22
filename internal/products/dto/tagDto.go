package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateTagRequest représente une requête pour créer une étiquette
type CreateTagRequest struct {
	Name  string  `json:"name" validate:"required,min=1,max=100"`
	Slug  string  `json:"slug" validate:"required,min=1,max=100"`
	Color *string `json:"color" validate:"omitempty,hexcolor"`
}

// UpdateTagRequest représente une requête pour mettre à jour une étiquette
type UpdateTagRequest struct {
	Name  *string `json:"name" validate:"omitempty,min=1,max=100"`
	Slug  *string `json:"slug" validate:"omitempty,min=1,max=100"`
	Color *string `json:"color" validate:"omitempty,hexcolor"`
}

// TagResponse représente la réponse pour une étiquette
type TagResponse struct {
	ID        uuid.UUID `json:"id"`
	StoreID   uuid.UUID `json:"store_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Color     *string   `json:"color,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ProductTagsRequest représente une requête pour associer des tags à un produit
type ProductTagsRequest struct {
	TagIDs []uuid.UUID `json:"tag_ids" validate:"required,dive,uuid4"`
}
