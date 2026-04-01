package models

import (
	"time"

	"github.com/google/uuid"
)

// ProductImage représente une image associée à un produit
type ProductImage struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID    uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"product_id"`
	URL          string     `gorm:"type:text;not null"                             json:"url"`
	URLThumbnail string     `gorm:"type:text;not null;default:''"                  json:"url_thumbnail"`
	URLMedium    string     `gorm:"type:text;not null;default:''"                  json:"url_medium"`
	URLLarge     string     `gorm:"type:text;not null;default:''"                  json:"url_large"`
	AltText      *string    `gorm:"type:text"                                      json:"alt_text"`
	Caption      *string    `gorm:"type:text"                                      json:"caption"`
	Position     int        `gorm:"not null;default:0"                             json:"position"`
	FileSize     int64      `gorm:"not null;default:0"                             json:"file_size"`
	FileType     string     `gorm:"type:varchar(100);not null;default:''"          json:"file_type"`
	CreatedAt    time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt    time.Time  `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt    *time.Time `gorm:"type:timestamptz;index"                         json:"deleted_at,omitempty"`
}
