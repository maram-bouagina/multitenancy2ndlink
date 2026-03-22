package models

import (
	"time"

	"github.com/google/uuid"
)

type CollectionType string

const (
	CollectionManual    CollectionType = "manual"
	CollectionAutomatic CollectionType = "automatic"
)

// Collection groups products for marketing purposes.
// Manual: admin assigns products explicitly.
// Automatic: products matched by a rule string (e.g. "price > 50").
type Collection struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Name      string         `gorm:"type:varchar(255);not null"                     json:"name"`
	Slug      string         `gorm:"type:varchar(255);not null;uniqueIndex:idx_col_slug_store" json:"slug"`
	Type      CollectionType `gorm:"type:varchar(20);not null;default:'manual'"     json:"type"`
	Rule      *string        `gorm:"type:text"                                      json:"rule,omitempty"`
	CreatedAt time.Time      `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt time.Time      `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`

	// Many-to-many with Product via collection_products join table
	Products []Product `gorm:"many2many:collection_products;" json:"products,omitempty"`
}
