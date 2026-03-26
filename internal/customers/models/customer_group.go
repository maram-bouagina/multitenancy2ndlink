package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomerGroup struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StoreID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"store_id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description *string        `gorm:"size:500" json:"description"`
	Discount    float64        `gorm:"default:0" json:"discount"` // percentage discount for this group
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (CustomerGroup) TableName() string { return "customer_groups" }

// Join table for many-to-many relationship
type CustomerGroupMember struct {
	CustomerGroupID uuid.UUID `gorm:"type:uuid;primaryKey" json:"customer_group_id"`
	CustomerID      string    `gorm:"type:text;primaryKey" json:"customer_id"`
	CreatedAt       time.Time `json:"created_at"`
}

func (CustomerGroupMember) TableName() string { return "customer_group_members" }
