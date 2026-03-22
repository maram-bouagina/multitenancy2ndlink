package dto

// Response types for the public storefront API.
// Fields are intentionally limited: no tenant IDs, no internal schema names,
// no draft layouts, no private product data.

type StorePublicResponse struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Slug                string  `json:"slug"`
	Logo                *string `json:"logo"`
	Email               *string `json:"email"`
	Phone               *string `json:"phone"`
	Address             *string `json:"address"`
	Currency            string  `json:"currency"`
	Language            string  `json:"language"`
	ThemePrimaryColor   string  `json:"theme_primary_color"`
	ThemeSecondaryColor string  `json:"theme_secondary_color"`
	ThemeMode           string  `json:"theme_mode"`
	ThemeFontFamily     string  `json:"theme_font_family"`
	StorefrontLayout    string  `json:"storefront_layout"` // published layout JSON
}

type CategoryPublicResponse struct {
	ID          string                   `json:"id"`
	Name        string                   `json:"name"`
	Slug        string                   `json:"slug"`
	Description *string                  `json:"description,omitempty"`
	Children    []CategoryPublicResponse `json:"children,omitempty"`
}

type CollectionPublicResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type ProductImagePublicResponse struct {
	URL          string  `json:"url"`
	URLThumbnail string  `json:"url_thumbnail"`
	URLMedium    string  `json:"url_medium"`
	URLLarge     string  `json:"url_large"`
	AltText      *string `json:"alt_text,omitempty"`
	Position     int     `json:"position"`
}

type ProductPublicResponse struct {
	ID                string                       `json:"id"`
	Title             string                       `json:"title"`
	Slug              string                       `json:"slug"`
	Description       *string                      `json:"description,omitempty"`
	Price             float64                      `json:"price"`
	EffectivePrice    float64                      `json:"effective_price"` // sale price if active
	IsOnSale          bool                         `json:"is_on_sale"`
	SalePrice         *float64                     `json:"sale_price,omitempty"`
	SaleEnd           *string                      `json:"sale_end,omitempty"` // RFC3339 if sale is active
	Currency          string                       `json:"currency"`
	Brand             *string                      `json:"brand,omitempty"`
	SKU               *string                      `json:"sku,omitempty"`
	Weight            *float64                     `json:"weight,omitempty"`
	Dimensions        *string                      `json:"dimensions,omitempty"`
	TaxClass          *string                      `json:"tax_class,omitempty"`
	TrackStock        bool                         `json:"track_stock"`
	InStock           bool                         `json:"in_stock"`
	Stock             int                          `json:"stock"`
	LowStockThreshold *int                         `json:"low_stock_threshold,omitempty"`
	CategoryID        *string                      `json:"category_id,omitempty"`
	Category          *CategoryPublicResponse      `json:"category,omitempty"`
	Collections       []CollectionPublicResponse   `json:"collections,omitempty"`
	Images            []ProductImagePublicResponse `json:"images"`
	CreatedAt         string                       `json:"created_at"`
}

type PaginatedProductsResponse struct {
	Products []ProductPublicResponse `json:"products"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	Limit    int                     `json:"limit"`
	Pages    int                     `json:"pages"`
}

type CollectionPageResponse struct {
	Collection CollectionPublicResponse  `json:"collection"`
	Products   PaginatedProductsResponse `json:"products"`
}

type ProductDetailResponse struct {
	Product ProductPublicResponse   `json:"product"`
	Related []ProductPublicResponse `json:"related"`
}
