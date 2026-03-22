package models

import (
	"time"

	"github.com/google/uuid"
)

// StockReservation représente une réservation temporaire de stock
type StockReservation struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" db:"id"`
	ProductID  uuid.UUID  `gorm:"type:uuid;not null;index" db:"product_id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" db:"user_id"`
	Quantity   int        `gorm:"not null" db:"quantity"`
	Reason     string     `gorm:"type:varchar(100)" db:"reason"` // ex: "order_pending", "cart_hold"
	ExpiresAt  time.Time  `gorm:"type:timestamptz" db:"expires_at"`
	ReleasedAt *time.Time `gorm:"type:timestamptz" db:"released_at"` // NULL = non libéré
	CreatedAt  time.Time  `gorm:"type:timestamptz;autoCreateTime" db:"created_at"`
}

// StockAdjustmentLog représente l'historique des ajustements
type StockAdjustmentLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" db:"id"`
	ProductID uuid.UUID `gorm:"type:uuid;not null;index" db:"product_id"`
	OldStock  int       `gorm:"not null" db:"old_stock"`
	NewStock  int       `gorm:"not null" db:"new_stock"`
	Reason    string    `gorm:"type:varchar(100)" db:"reason"` // ex: "supplier_receipt", "inventory_correction", "order_placed"
	CreatedAt time.Time `gorm:"type:timestamptz;autoCreateTime" db:"created_at"`
	CreatedBy uuid.UUID `gorm:"type:uuid" db:"created_by"` // administrateur qui a fait l'ajustement
}
