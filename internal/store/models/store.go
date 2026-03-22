package models

import (
	"time"

	"github.com/google/uuid"
)

type Store struct {
	ID                        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID                  uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"tenant_id"`
	Name                      string     `gorm:"type:varchar(255);not null"                     json:"name"`
	Slug                      string     `gorm:"type:varchar(255);uniqueIndex;not null"          json:"slug"`
	Email                     *string    `gorm:"type:varchar(255)"                              json:"email"`
	Phone                     *string    `gorm:"type:varchar(20)"                               json:"phone"`
	Address                   *string    `gorm:"type:text"                                      json:"address"`
	Logo                      *string    `gorm:"type:varchar(500)"                              json:"logo"`
	Currency                  string     `gorm:"type:varchar(10);not null;default:'EUR'"        json:"currency"`
	Timezone                  string     `gorm:"type:varchar(100);not null;default:'UTC'"       json:"timezone"`
	Language                  string     `gorm:"type:varchar(10);not null;default:'fr'"         json:"language"`
	ThemePrimaryColor         string     `gorm:"type:varchar(20);not null;default:'#2563eb'" json:"theme_primary_color"`
	ThemeSecondaryColor       string     `gorm:"type:varchar(20);not null;default:'#0f172a'" json:"theme_secondary_color"`
	ThemeMode                 string     `gorm:"type:varchar(20);not null;default:'light';check:theme_mode IN ('light','dark','auto')" json:"theme_mode"`
	ThemeFontFamily           string     `gorm:"type:varchar(100);not null;default:'Inter'" json:"theme_font_family"`
	StorefrontLayoutDraft     string     `gorm:"type:text;not null;default:'[]'" json:"storefront_layout_draft"`
	StorefrontLayoutPublished string     `gorm:"type:text;not null;default:'[]'" json:"storefront_layout_published"`
	ThemeVersion              int        `gorm:"not null;default:1" json:"theme_version"`
	TaxNumber                 *string    `gorm:"type:varchar(100)"                              json:"tax_number"`
	Status                    string     `gorm:"type:varchar(20);default:'active';check:status IN ('active','suspended','inactive')" json:"status"`
	CreatedAt                 time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt                 time.Time  `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt                 *time.Time `gorm:"type:timestamptz;index"                         json:"-"`
}

func (Store) TableName() string {
	return "stores"
}
