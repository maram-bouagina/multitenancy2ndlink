package models

import (
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email         string     `gorm:"type:varchar(255);uniqueIndex;not null"         json:"email"`
	PasswordHash  string     `gorm:"type:varchar(255);not null"                    json:"-"`
	FirstName     string     `gorm:"type:varchar(100);not null"                    json:"first_name"`
	LastName      string     `gorm:"type:varchar(100);not null"                    json:"last_name"`
	Phone         *string    `gorm:"type:varchar(20)"                              json:"phone"`
	Avatar        *string    `gorm:"type:varchar(500)"                             json:"avatar"`
	Plan          string     `gorm:"type:varchar(50);default:'free';check:plan IN ('free','pro','enterprise')"                     json:"plan"`
	Status        string     `gorm:"type:varchar(20);default:'pending';check:status IN ('active','unpaid','suspended','pending')"  json:"status"`
	EmailVerified bool       `gorm:"default:false"                                 json:"email_verified"`
	LastLoginAt   *time.Time `gorm:"type:timestamptz"                              json:"last_login_at"`
	CreatedAt     time.Time  `gorm:"type:timestamptz;autoCreateTime"               json:"created_at"`
	UpdatedAt     time.Time  `gorm:"type:timestamptz;autoUpdateTime"               json:"updated_at"`
	DeletedAt     *time.Time `gorm:"type:timestamptz;index"                        json:"-"`
}

func (Tenant) TableName() string {
	return "public.tenants"
}

type PublicTenant struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Plan      string    `json:"plan"`
	Status    string    `json:"status"`
}

func ToPublicTenant(t Tenant) PublicTenant {
	return PublicTenant{
		ID:        t.ID,
		Email:     t.Email,
		FirstName: t.FirstName,
		LastName:  t.LastName,
		Plan:      t.Plan,
		Status:    t.Status,
	}
}
