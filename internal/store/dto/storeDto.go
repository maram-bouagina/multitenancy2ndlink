package dto

type CreateStoreRequest struct {
	Name                  string  `json:"name"      validate:"required"`
	Slug                  string  `json:"slug"      validate:"required"`
	Email                 *string `json:"email"`
	Phone                 *string `json:"phone"`
	Address               *string `json:"address"`
	Logo                  *string `json:"logo"`
	Currency              string  `json:"currency"  validate:"required"`
	Timezone              string  `json:"timezone"  validate:"required"`
	Language              string  `json:"language"  validate:"required"`
	ThemePrimaryColor     *string `json:"theme_primary_color" validate:"omitempty,hexcolor"`
	ThemeSecondaryColor   *string `json:"theme_secondary_color" validate:"omitempty,hexcolor"`
	ThemeMode             *string `json:"theme_mode" validate:"omitempty,oneof=light dark auto"`
	ThemeFontFamily       *string `json:"theme_font_family"`
	StorefrontLayoutDraft *string `json:"storefront_layout_draft"`
	TaxNumber             *string `json:"tax_number"`
}

type UpdateStoreRequest struct {
	Name                  *string `json:"name"`
	Email                 *string `json:"email"`
	Phone                 *string `json:"phone"`
	Address               *string `json:"address"`
	Logo                  *string `json:"logo"`
	Currency              *string `json:"currency"`
	Timezone              *string `json:"timezone"`
	Language              *string `json:"language"`
	ThemePrimaryColor     *string `json:"theme_primary_color" validate:"omitempty,hexcolor"`
	ThemeSecondaryColor   *string `json:"theme_secondary_color" validate:"omitempty,hexcolor"`
	ThemeMode             *string `json:"theme_mode" validate:"omitempty,oneof=light dark auto"`
	ThemeFontFamily       *string `json:"theme_font_family"`
	StorefrontLayoutDraft *string `json:"storefront_layout_draft"`
	TaxNumber             *string `json:"tax_number"`
	Status                *string `json:"status" validate:"omitempty,oneof=active suspended inactive"`
}

type PublishStoreCustomizationRequest struct {
	UseDraftLayout *bool `json:"use_draft_layout"`
}

type StoreResponse struct {
	ID                        string  `json:"id"`
	TenantID                  string  `json:"tenant_id"`
	Name                      string  `json:"name"`
	Slug                      string  `json:"slug"`
	Email                     *string `json:"email"`
	Phone                     *string `json:"phone"`
	Address                   *string `json:"address"`
	Logo                      *string `json:"logo"`
	Currency                  string  `json:"currency"`
	Timezone                  string  `json:"timezone"`
	Language                  string  `json:"language"`
	ThemePrimaryColor         string  `json:"theme_primary_color"`
	ThemeSecondaryColor       string  `json:"theme_secondary_color"`
	ThemeMode                 string  `json:"theme_mode"`
	ThemeFontFamily           string  `json:"theme_font_family"`
	StorefrontLayoutDraft     string  `json:"storefront_layout_draft"`
	StorefrontLayoutPublished string  `json:"storefront_layout_published"`
	ThemeVersion              int     `json:"theme_version"`
	TaxNumber                 *string `json:"tax_number"`
	Status                    string  `json:"status"`
}
