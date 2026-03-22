package models

import (
	"time"

	"github.com/google/uuid"
)

// ProductImage représente une image associée à un produit
type ProductImage struct {
	ID           uuid.UUID  `db:"id"`
	ProductID    uuid.UUID  `db:"product_id"`
	URL          string     `db:"url"`
	URLThumbnail string     `db:"url_thumbnail"`
	URLMedium    string     `db:"url_medium"`
	URLLarge     string     `db:"url_large"`
	AltText      *string    `db:"alt_text"`
	Caption      *string    `db:"caption"`
	Position     int        `db:"position"`
	FileSize     int64      `db:"file_size"`
	FileType     string     `db:"file_type"`
	CreatedAt    time.Time  `db:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"`
	DeletedAt    *time.Time `db:"deleted_at"`
}
