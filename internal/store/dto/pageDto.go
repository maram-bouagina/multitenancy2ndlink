package dto

type CreatePageRequest struct {
	Type  string `json:"type"  validate:"required,oneof=home promo blog info"`
	Title string `json:"title" validate:"required"`
	Slug  string `json:"slug"  validate:"required"`
}

type UpdatePageRequest struct {
	Title       *string `json:"title"`
	LayoutDraft *string `json:"layout_draft"`
	Status      *string `json:"status" validate:"omitempty,oneof=draft published"`
	MetaTitle   *string `json:"meta_title"`
	MetaDesc    *string `json:"meta_description"`
}

type PublishPageRequest struct{}

type PageResponse struct {
	ID              string  `json:"id"`
	StoreID         string  `json:"store_id"`
	Type            string  `json:"type"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	LayoutDraft     string  `json:"layout_draft"`
	LayoutPublished string  `json:"layout_published"`
	Status          string  `json:"status"`
	MetaTitle       *string `json:"meta_title"`
	MetaDesc        *string `json:"meta_description"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// PagePublicResponse — vitrine publique, n'expose que layout publié
type PagePublicResponse struct {
	Slug            string  `json:"slug"`
	Title           string  `json:"title"`
	LayoutPublished string  `json:"layout_published"`
	MetaTitle       *string `json:"meta_title"`
	MetaDesc        *string `json:"meta_description"`
}

// PagePublicListItem — lightweight item for navigation menus
type PagePublicListItem struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
}
