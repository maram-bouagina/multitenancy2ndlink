package repo

import (
	"multitenancypfe/internal/customers/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomerRepo struct{}

func New() *CustomerRepo { return &CustomerRepo{} }

// ── Customer queries ─────────────────────────────────────────────────────────

func (r *CustomerRepo) FindByEmail(db *gorm.DB, storeID uuid.UUID, email string) (*models.Customer, error) {
	var c models.Customer
	err := db.Where("store_id = ? AND email = ?", storeID, email).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *CustomerRepo) FindByID(db *gorm.DB, id string) (*models.Customer, error) {
	var c models.Customer
	err := db.Where("id = ?", id).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *CustomerRepo) FindByVerifyToken(db *gorm.DB, token string) (*models.Customer, error) {
	var c models.Customer
	err := db.Where("email_verify_token = ?", token).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *CustomerRepo) FindByResetToken(db *gorm.DB, token string) (*models.Customer, error) {
	var c models.Customer
	err := db.Where("reset_token = ?", token).First(&c).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &c, err
}

func (r *CustomerRepo) Create(db *gorm.DB, customer *models.Customer) error {
	return db.Create(customer).Error
}

func (r *CustomerRepo) Update(db *gorm.DB, customer *models.Customer) error {
	return db.Save(customer).Error
}

func (r *CustomerRepo) Delete(db *gorm.DB, id string) error {
	return db.Where("id = ?", id).Delete(&models.Customer{}).Error
}

// ── Address queries ──────────────────────────────────────────────────────────────────

func (r *CustomerRepo) ListAddresses(db *gorm.DB, customerID string) ([]models.CustomerAddress, error) {
	var addrs []models.CustomerAddress
	err := db.Where("customer_id = ?", customerID).Order("is_default DESC, created_at ASC").Find(&addrs).Error
	return addrs, err
}

func (r *CustomerRepo) FindAddress(db *gorm.DB, id uuid.UUID, customerID string) (*models.CustomerAddress, error) {
	var addr models.CustomerAddress
	err := db.Where("id = ? AND customer_id = ?", id, customerID).First(&addr).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &addr, err
}

func (r *CustomerRepo) CreateAddress(db *gorm.DB, addr *models.CustomerAddress) error {
	return db.Create(addr).Error
}

func (r *CustomerRepo) UpdateAddress(db *gorm.DB, addr *models.CustomerAddress) error {
	return db.Save(addr).Error
}

func (r *CustomerRepo) DeleteAddress(db *gorm.DB, id uuid.UUID, customerID string) error {
	return db.Where("id = ? AND customer_id = ?", id, customerID).Delete(&models.CustomerAddress{}).Error
}

func (r *CustomerRepo) ClearDefaultAddresses(db *gorm.DB, customerID string) error {
	return db.Model(&models.CustomerAddress{}).
		Where("customer_id = ? AND is_default = true", customerID).
		Update("is_default", false).Error
}
