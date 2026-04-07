package models

import (
	"time"

	"github.com/google/uuid"
)

type CategoryVisibility string

const (
	CategoryPublic  CategoryVisibility = "public"
	CategoryPrivate CategoryVisibility = "private"
)

// Category uses adjacency list for arbitrary depth tree.
// parent_id NULL = root category.
type Category struct {
	ID          uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"          json:"id"`
	StoreID     uuid.UUID          `gorm:"type:uuid;not null;index;uniqueIndex:idx_cat_slug_store" json:"store_id"`
	ParentID    *uuid.UUID         `gorm:"type:uuid;index"                                         json:"parent_id,omitempty"`
	Name        string             `gorm:"type:varchar(255);not null"                              json:"name"`
	Slug        string             `gorm:"type:varchar(255);not null;uniqueIndex:idx_cat_slug_store" json:"slug"`
	Description     *string            `gorm:"type:text"                                               json:"description,omitempty"`
	MetaTitle        *string            `gorm:"type:varchar(255)"                                       json:"meta_title,omitempty"`
	MetaDescription  *string            `gorm:"type:text"                                               json:"meta_description,omitempty"`
	CanonicalURL     *string            `gorm:"type:varchar(2048)"                                      json:"canonical_url,omitempty"`
	Noindex          bool               `gorm:"not null;default:false"                                  json:"noindex"`
	ImageURL         *string            `gorm:"type:varchar(2048)"                                      json:"image_url,omitempty"`
	Visibility       CategoryVisibility `gorm:"type:varchar(20);not null;default:'public'"              json:"visibility"`
	CreatedAt   time.Time          `gorm:"type:timestamptz;autoCreateTime"                         json:"created_at"`
	UpdatedAt   time.Time          `gorm:"type:timestamptz;autoUpdateTime"                         json:"updated_at"`

	// Relations (loaded on demand)
	Children []Category `gorm:"foreignKey:ParentID"   json:"children,omitempty"`
	Products []Product  `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
}
