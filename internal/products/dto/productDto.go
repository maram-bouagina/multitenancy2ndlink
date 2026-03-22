package dto

import (
	"time"

	"multitenancypfe/internal/products/models"

	"github.com/google/uuid"
)

// DTO pour créer un produit
type CreateProductRequest struct {
	CategoryID        *uuid.UUID               `json:"category_id"`
	Title             string                   `json:"title" validate:"required,min=1,max=255"`
	Description       *string                  `json:"description"`
	Slug              *string                  `json:"slug"`
	Status            models.ProductStatus     `json:"status" validate:"required,oneof=draft published archived"`
	Visibility        models.ProductVisibility `json:"visibility" validate:"required,oneof=public private"`
	Price             float64                  `json:"price" validate:"min=0"`
	SalePrice         *float64                 `json:"sale_price,omitempty" validate:"omitempty,min=0"`
	SaleStart         *time.Time               `json:"sale_start,omitempty"`
	SaleEnd           *time.Time               `json:"sale_end,omitempty"`
	Currency          string                   `json:"currency" validate:"required,len=3"`
	SKU               *string                  `json:"sku"`
	TrackStock        bool                     `json:"track_stock"`
	Stock             int                      `json:"stock" validate:"min=0"`
	LowStockThreshold *int                     `json:"low_stock_threshold,omitempty" validate:"omitempty,min=1"`
	Weight            *float64                 `json:"weight" validate:"omitempty,min=0"`
	Dimensions        *string                  `json:"dimensions"`
	Brand             *string                  `json:"brand"`
	TaxClass          *string                  `json:"tax_class"`
	PublishedAt       *time.Time               `json:"published_at"`
}

// DTO pour mettre à jour un produit (champs optionnels)
type UpdateProductRequest struct {
	CategoryID        *uuid.UUID                `json:"category_id"`
	Title             *string                   `json:"title" validate:"omitempty,min=1,max=255"`
	Description       *string                   `json:"description"`
	Slug              *string                   `json:"slug"`
	Status            *models.ProductStatus     `json:"status" validate:"omitempty,oneof=draft published archived"`
	Visibility        *models.ProductVisibility `json:"visibility" validate:"omitempty,oneof=public private"`
	Price             *float64                  `json:"price" validate:"omitempty,min=0"`
	SalePrice         *float64                  `json:"sale_price,omitempty" validate:"omitempty,min=0"`
	SaleStart         *time.Time                `json:"sale_start,omitempty"`
	SaleEnd           *time.Time                `json:"sale_end,omitempty"`
	Currency          *string                   `json:"currency" validate:"omitempty,len=3"`
	SKU               *string                   `json:"sku"`
	TrackStock        *bool                     `json:"track_stock"`
	Stock             *int                      `json:"stock" validate:"omitempty,min=0"`
	LowStockThreshold *int                      `json:"low_stock_threshold,omitempty" validate:"omitempty,min=1"`
	Weight            *float64                  `json:"weight" validate:"omitempty,min=0"`
	Dimensions        *string                   `json:"dimensions"`
	Brand             *string                   `json:"brand"`
	TaxClass          *string                   `json:"tax_class"`
	PublishedAt       *time.Time                `json:"published_at"`
}

// Filtres pour requêtes GET
// NOTE: plain string types are required here because Fiber v2's QueryParser
// cannot decode custom/pointer types (uuid.UUID, ProductStatus, …) from query strings.
type ProductFilter struct {
	CategoryID string `query:"category_id"`
	Status     string `query:"status"`
	Visibility string `query:"visibility"`
	Brand      string `query:"brand"`
	Search     string `query:"search"`
	PriceMin   *float64
	PriceMax   *float64
	InStock    *bool
	SortBy     string
	Page       int `query:"page"`
	Limit      int `query:"limit"`
}

// Filtres avancés pour la recherche et filtrage du catalogue
type ProductSearchFilter struct {
	// Recherche plein texte
	Search *string `query:"search" validate:"omitempty,max=255"`

	// Filtres de catégorie
	CategoryID *uuid.UUID `query:"category_id"`

	// Filtres de prix
	PriceMin *float64 `query:"price_min" validate:"omitempty,min=0"`
	PriceMax *float64 `query:"price_max" validate:"omitempty,min=0"`

	// Filtres de disponibilité
	InStock *bool `query:"in_stock"`

	// Filtres de marque
	Brand *string `query:"brand" validate:"omitempty,max=100"`

	// Filtres de visibilité et statut
	Visibility *models.ProductVisibility `query:"visibility"`
	Status     *models.ProductStatus     `query:"status"`

	// Tri : relevance, price_asc, price_desc, newest
	SortBy *string `query:"sort_by" validate:"omitempty,oneof=relevance price_asc price_desc newest"`

	// Pagination
	Page  int `query:"page" validate:"min=1"`
	Limit int `query:"limit" validate:"min=1,max=100"`
}

// Réponse pour un produit
type ProductResponse struct {
	ID                uuid.UUID                `json:"id"`
	StoreID           uuid.UUID                `json:"store_id"`
	CategoryID        *uuid.UUID               `json:"category_id,omitempty"`
	Title             string                   `json:"title"`
	Description       *string                  `json:"description,omitempty"`
	Slug              string                   `json:"slug"`
	Status            models.ProductStatus     `json:"status"`
	Visibility        models.ProductVisibility `json:"visibility"`
	Price             float64                  `json:"price"`
	SalePrice         *float64                 `json:"sale_price,omitempty"`
	SaleStart         *time.Time               `json:"sale_start,omitempty"`
	SaleEnd           *time.Time               `json:"sale_end,omitempty"`
	EffectivePrice    float64                  `json:"effective_price"`           // prix effectif calculé
	OnSale            bool                     `json:"on_sale"`                   // indicateur: en solde?
	SaleExpiresAt     *time.Time               `json:"sale_expires_at,omitempty"` // quand la solde expire?
	Currency          string                   `json:"currency"`
	SKU               *string                  `json:"sku,omitempty"`
	TrackStock        bool                     `json:"track_stock"`
	Stock             int                      `json:"stock"`
	LowStockThreshold *int                     `json:"low_stock_threshold,omitempty"`
	Weight            *float64                 `json:"weight,omitempty"`
	Dimensions        *string                  `json:"dimensions,omitempty"`
	Brand             *string                  `json:"brand,omitempty"`
	TaxClass          *string                  `json:"tax_class,omitempty"`
	PublishedAt       *time.Time               `json:"published_at,omitempty"`
	CreatedAt         time.Time                `json:"created_at"`
	UpdatedAt         time.Time                `json:"updated_at"`
	Category          *CategoryResponse        `json:"category,omitempty"`
	Collections       []CollectionResponse     `json:"collections,omitempty"`
	Tags              []TagResponse            `json:"tags,omitempty"`
}

// Liste de produits – structure alignée sur PaginatedResponse<T> du frontend
type ProductListResponse struct {
	Data       []ProductResponse `json:"data"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

// Réponse pour un produit avec ses images
type ProductWithImagesResponse struct {
	ProductResponse
	Images []ProductImageResponse `json:"images"`
}

// Réponse pour un produit complet (images + relations + tags + attributs)
type ProductDetailResponse struct {
	ProductResponse
	Images            []ProductImageResponse `json:"images"`
	UpsellProducts    []ProductResponse      `json:"upsell_products,omitempty"`     // Montée en gamme
	CrossSellProducts []ProductResponse      `json:"cross_sell_products,omitempty"` // Vente croisée
	Tags              []TagResponse          `json:"tags,omitempty"`
}

// Réponse pour la recherche de produits avec pagination
type SearchProductsResponse struct {
	Products []ProductWithImagesResponse `json:"products"`
	Total    int64                       `json:"total"`
	Page     int                         `json:"page"`
	Limit    int                         `json:"limit"`
	Pages    int                         `json:"pages"`
}

// CloneProductRequest représente une requête pour dupliquer un produit
type CloneProductRequest struct {
	SourceProductID uuid.UUID `json:"source_product_id" validate:"required,uuid4"`
	Title           string    `json:"title" validate:"required,min=1,max=255"`
	SKUSuffix       *string   `json:"sku_suffix" validate:"omitempty,max=20"` // ex: "-COPY"
	IncludeImages   bool      `json:"include_images" validate:"boolean"`      // dupliquer les images?
}

// CloneProductResponse représente la réponse après clonage
type CloneProductResponse struct {
	ClonedProduct *ProductDetailResponse `json:"cloned_product"`
	Message       string                 `json:"message"`
}

// AdjustStockRequest représente une requête pour ajuster le stock
type AdjustStockRequest struct {
	Quantity int    `json:"quantity" validate:"required,min=-999999,max=999999"` // + ou - selon le sens
	Reason   string `json:"reason" validate:"required,max=255"`                  // ex: "supplier_receipt", "inventory_correction"
}

// StockAdjustmentResponse représente la réponse après ajustement de stock
type StockAdjustmentResponse struct {
	ProductID         uuid.UUID `json:"product_id"`
	PreviousStock     int       `json:"previous_stock"`
	NewStock          int       `json:"new_stock"`
	IsLowStock        bool      `json:"is_low_stock"`
	LowStockThreshold *int      `json:"low_stock_threshold,omitempty"`
}

// StockReservationRequest représente une requête pour réserver du stock
type StockReservationRequest struct {
	Quantity int `json:"quantity" validate:"required,gt=0"`
}

// StockReservationResponse représente la réponse après réservation
type StockReservationResponse struct {
	ReservationID    uuid.UUID `json:"reservation_id"`
	ProductID        uuid.UUID `json:"product_id"`
	QuantityReserved int       `json:"quantity_reserved"`
	AvailableStock   int       `json:"available_stock"`
	ExpiresAt        time.Time `json:"expires_at"`
}
