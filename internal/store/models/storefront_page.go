package models

import (
	"time"

	"github.com/google/uuid"
)

type StorefrontPage struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID         uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Type            string     `gorm:"type:varchar(50);not null"                      json:"type"`
	Title           string     `gorm:"type:varchar(255);not null"                     json:"title"`
	Slug            string     `gorm:"type:varchar(255);not null"                     json:"slug"`
	LayoutDraft     string     `gorm:"type:text;not null;default:'{}'"                json:"layout_draft"`
	LayoutPublished string     `gorm:"type:text;not null;default:'{}'"                json:"layout_published"`
	Status          string     `gorm:"type:varchar(20);default:'published'"           json:"status"`
	MetaTitle       *string    `gorm:"type:varchar(255)"                              json:"meta_title"`
	MetaDesc        *string    `gorm:"type:text"                                      json:"meta_description"`
	CreatedAt       time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt       time.Time  `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt       *time.Time `gorm:"type:timestamptz;index"                         json:"-"`
}

func (StorefrontPage) TableName() string { return "storefront_pages" }
