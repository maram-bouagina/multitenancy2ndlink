package models

import "github.com/google/uuid"

// StoreSlugIndex lives in the PUBLIC schema and maps a globally-unique store
// slug to its tenant partition (tenant_id) and store row (store_id).
// This allows unauthenticated requests to locate the correct DB partition
// without scanning every tenant schema.
type StoreSlugIndex struct {
	Slug     string    `gorm:"type:varchar(255);primaryKey"              json:"-"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index"                  json:"-"`
	StoreID  uuid.UUID `gorm:"type:uuid;not null"                        json:"-"`
	Status   string    `gorm:"type:varchar(20);not null;default:'active'" json:"-"`
}

func (StoreSlugIndex) TableName() string { return "store_slug_index" }
