package models

import (
	"time"

	"github.com/google/uuid"
)

// RelationType représente le type de relation entre deux produits
type RelationType string

const (
	RelationTypeUpsell    RelationType = "upsell"     // Montée en gamme (produit plus cher/premium)
	RelationTypeCrossSell RelationType = "cross_sell" // Vente croisée (produit complémentaire)
)

// ProductRelation représente une relation entre deux produits
type ProductRelation struct {
	ID               uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SourceProductID  uuid.UUID    `gorm:"type:uuid;not null;index" json:"source_product_id"`
	RelatedProductID uuid.UUID    `gorm:"type:uuid;not null;index" json:"related_product_id"`
	RelationType     RelationType `gorm:"type:varchar(20);not null;index" json:"relation_type"`
	Position         int          `gorm:"not null;default:0" json:"position"`
	CreatedAt        time.Time    `gorm:"type:timestamptz;autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time    `gorm:"type:timestamptz;autoUpdateTime" json:"updated_at"`
	DeletedAt        *time.Time   `gorm:"type:timestamptz;index" json:"-"`

	RelatedProduct *Product `gorm:"foreignKey:RelatedProductID" json:"related_product,omitempty"`
}
