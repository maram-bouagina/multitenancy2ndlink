package models

import (
	"time"

	"github.com/google/uuid"
)

type NewsletterSubscriber struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"store_id"`
	Email     string     `gorm:"type:varchar(255);not null"                     json:"email"`
	FirstName string     `gorm:"type:varchar(100)"                              json:"first_name"`
	Active    bool       `gorm:"not null;default:true"                          json:"active"`
	CreatedAt time.Time  `gorm:"type:timestamptz;autoCreateTime"                json:"created_at"`
	UpdatedAt time.Time  `gorm:"type:timestamptz;autoUpdateTime"                json:"updated_at"`
	DeletedAt *time.Time `gorm:"type:timestamptz;index"                         json:"-"`
}

func (NewsletterSubscriber) TableName() string {
	return "newsletter_subscribers"
}
