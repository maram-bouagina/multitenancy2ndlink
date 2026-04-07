package dto

import (
	"time"

	"github.com/google/uuid"

	"multitenancypfe/internal/products/models"
)

type CreateCategoryRequest struct {
	ParentID        *uuid.UUID                `json:"parent_id"`
	Name            string                    `json:"name"        validate:"required,min=1,max=255"`
	Slug            *string                   `json:"slug"`
	Description     *string                   `json:"description"`
	MetaTitle       *string                   `json:"meta_title"`
	MetaDescription *string                   `json:"meta_description"`
	CanonicalURL    *string                   `json:"canonical_url" validate:"omitempty,url"`
	Noindex         bool                      `json:"noindex"`
	ImageURL        *string                   `json:"image_url" validate:"omitempty,url"`
	Visibility      models.CategoryVisibility `json:"visibility"  validate:"required,oneof=public private"`
}

type UpdateCategoryRequest struct {
	ParentID        *uuid.UUID                 `json:"parent_id"`
	Name            *string                    `json:"name"        validate:"omitempty,min=1,max=255"`
	Slug            *string                    `json:"slug"`
	Description     *string                    `json:"description"`
	MetaTitle       *string                    `json:"meta_title"`
	MetaDescription *string                    `json:"meta_description"`
	CanonicalURL    *string                    `json:"canonical_url" validate:"omitempty,url"`
	Noindex         *bool                      `json:"noindex"`
	ImageURL        *string                    `json:"image_url" validate:"omitempty,url"`
	Visibility      *models.CategoryVisibility `json:"visibility"  validate:"omitempty,oneof=public private"`
}

type CategoryResponse struct {
	ID              uuid.UUID                 `json:"id"`
	StoreID         uuid.UUID                 `json:"store_id"`
	ParentID        *uuid.UUID                `json:"parent_id,omitempty"`
	Name            string                    `json:"name"`
	Slug            string                    `json:"slug"`
	Description     *string                   `json:"description,omitempty"`
	MetaTitle       *string                   `json:"meta_title,omitempty"`
	MetaDescription *string                   `json:"meta_description,omitempty"`
	CanonicalURL    *string                   `json:"canonical_url,omitempty"`
	Noindex         bool                      `json:"noindex"`
	ImageURL        *string                   `json:"image_url,omitempty"`
	Visibility      models.CategoryVisibility `json:"visibility"`
	CreatedAt       time.Time                 `json:"created_at"`
	UpdatedAt       time.Time                 `json:"updated_at"`
	Children        []CategoryResponse        `json:"children,omitempty"`
}
