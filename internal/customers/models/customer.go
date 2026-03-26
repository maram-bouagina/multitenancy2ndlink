package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Customer represents a store customer (shopper) within a tenant schema.
// Table name: "clients" — one per tenant schema, email unique per store.
// ID is a text string set by Better Auth (not a UUID).
type Customer struct {
	ID               string         `gorm:"type:text;primaryKey"                           json:"id"`
	StoreID          uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Email            string         `gorm:"type:varchar(255);not null"                     json:"email"`
	PasswordHash     string         `gorm:"type:varchar(255)"                              json:"-"`
	FirstName        string         `gorm:"type:varchar(100);not null"                     json:"first_name"`
	LastName         string         `gorm:"type:varchar(100);not null"                     json:"last_name"`
	Phone            *string        `gorm:"type:varchar(20)"                               json:"phone"`
	Avatar           *string        `gorm:"type:text"                                      json:"avatar"`
	Status           string         `gorm:"type:varchar(20);default:'pending';check:status IN ('active','pending','suspended')" json:"status"`
	EmailVerified    bool           `gorm:"default:false"                                  json:"email_verified"`
	EmailVerifyToken *string        `gorm:"type:varchar(255)"                              json:"-"`
	EmailVerifyExp   *time.Time     `gorm:"type:timestamptz"                               json:"-"`
	ResetToken       *string        `gorm:"type:varchar(255)"                              json:"-"`
	ResetTokenExp    *time.Time     `gorm:"type:timestamptz"                               json:"-"`
	TwoFactorEnabled bool           `gorm:"default:false"                                  json:"two_factor_enabled"`
	TwoFactorSecret  *string        `gorm:"type:varchar(255)"                              json:"-"`
	OAuthProvider    *string        `gorm:"type:varchar(50)"                               json:"oauth_provider"`
	OAuthID          *string        `gorm:"type:varchar(255)"                              json:"-"`
	AcceptsMarketing bool           `gorm:"default:false"                                  json:"accepts_marketing"`
	LastLoginAt      *time.Time     `gorm:"type:timestamptz"                               json:"last_login_at"`
	CreatedAt        time.Time      `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt        time.Time      `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

func (Customer) TableName() string { return "clients" }

// CustomerAddress stores customer shipping/billing addresses.
type CustomerAddress struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CustomerID string         `gorm:"type:text;not null;index"                       json:"customer_id"`
	StoreID    uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Label      string         `gorm:"type:varchar(50);default:'home'"                json:"label"`
	FirstName  string         `gorm:"type:varchar(100);not null"                     json:"first_name"`
	LastName   string         `gorm:"type:varchar(100);not null"                     json:"last_name"`
	Company    *string        `gorm:"type:varchar(255)"                              json:"company"`
	Address1   string         `gorm:"type:varchar(500);not null"                     json:"address1"`
	Address2   *string        `gorm:"type:varchar(500)"                              json:"address2"`
	City       string         `gorm:"type:varchar(100);not null"                     json:"city"`
	State      *string        `gorm:"type:varchar(100)"                              json:"state"`
	PostalCode string         `gorm:"type:varchar(20);not null"                      json:"postal_code"`
	Country    string         `gorm:"type:varchar(100);not null"                     json:"country"`
	Phone      *string        `gorm:"type:varchar(20)"                               json:"phone"`
	IsDefault  bool           `gorm:"default:false"                                  json:"is_default"`
	CreatedAt  time.Time      `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt  time.Time      `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

func (CustomerAddress) TableName() string { return "client_addresses" }
