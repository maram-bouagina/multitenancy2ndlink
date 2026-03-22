package dto

import (
	"github.com/google/uuid"
)

// CreateProductRelationRequest représente une requête pour créer une relation entre produits
type CreateProductRelationRequest struct {
	RelatedProductID uuid.UUID `json:"related_product_id" validate:"required,uuid4"`
	RelationType     string    `json:"relation_type" validate:"required,oneof=upsell cross_sell"`
	Position         int       `json:"position" validate:"min=0"`
}

// UpdateProductRelationRequest représente une requête pour mettre à jour une relation
type UpdateProductRelationRequest struct {
	RelationType *string `json:"relation_type" validate:"omitempty,oneof=upsell cross_sell"`
	Position     *int    `json:"position" validate:"omitempty,min=0"`
}

// ProductRelationResponse représente la réponse pour une relation de produit
type ProductRelationResponse struct {
	ID               uuid.UUID        `json:"id"`
	SourceProductID  uuid.UUID        `json:"source_product_id"`
	RelatedProductID uuid.UUID        `json:"related_product_id"`
	RelationType     string           `json:"relation_type"`
	Position         int              `json:"position"`
	RelatedProduct   *ProductResponse `json:"related_product,omitempty"`
}

// BulkProductRelationRequest représente une requête pour assigner plusieurs relations en masse
type BulkProductRelationRequest struct {
	Relations []CreateProductRelationRequest `json:"relations" validate:"required,dive"`
}

// ProductWithRelationsResponse représente un produit avec ses relations
type ProductWithRelationsResponse struct {
	ProductResponse
	UpsellProducts    []ProductRelationResponse `json:"upsell_products,omitempty"`     // Montée en gamme
	CrossSellProducts []ProductRelationResponse `json:"cross_sell_products,omitempty"` // Vente croisée
}
