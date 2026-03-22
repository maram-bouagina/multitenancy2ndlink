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
	ID               uuid.UUID    `db:"id"`
	SourceProductID  uuid.UUID    `db:"source_product_id"`  // Produit source
	RelatedProductID uuid.UUID    `db:"related_product_id"` // Produit associé
	RelationType     RelationType `db:"relation_type"`      // upsell ou cross_sell
	Position         int          `db:"position"`           // Ordre d'affichage
	CreatedAt        time.Time    `db:"created_at"`
	UpdatedAt        time.Time    `db:"updated_at"`
	DeletedAt        *time.Time   `db:"deleted_at"`
}
