package models

import (
	"time"

	"github.com/google/uuid"
)

// Tag représente une étiquette/étiquette de produit
type Tag struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Name      string     `gorm:"type:varchar(255);not null"                     json:"name"`
	Slug      string     `gorm:"type:varchar(255);uniqueIndex;not null"          json:"slug"`
	Color     *string    `gorm:"type:varchar(7)"                                json:"color"`
	CreatedAt time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt time.Time  `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt *time.Time `gorm:"type:timestamptz;index"                         json:"deleted_at"`
}

// ProductTag représente l'association entre un produit et une étiquette
type ProductTag struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"product_id"`
	TagID     uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"tag_id"`
	CreatedAt time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	DeletedAt *time.Time `gorm:"type:timestamptz;index"                         json:"deleted_at"`
}

func (Tag) TableName() string {
	return "tags"
}

func (ProductTag) TableName() string {
	return "product_tags"
}
