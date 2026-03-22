package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/auth/models"
)

type TenantRepository interface {
	Create(tenant *models.Tenant) error
	FindByID(id uuid.UUID) (*models.Tenant, error)
	FindByEmail(email string) (*models.Tenant, error)
	FindAll() ([]models.Tenant, error)
	Update(tenant *models.Tenant) error
	Delete(id uuid.UUID) error
	Restore(id uuid.UUID) error
	FindByEmailIncludeDeleted(email string) (*models.Tenant, error)
}

type tenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) TenantRepository {
	return &tenantRepository{db: db}
}

func (r *tenantRepository) Create(tenant *models.Tenant) error {
	return r.db.Create(tenant).Error
}

func (r *tenantRepository) FindByID(id uuid.UUID) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&tenant).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &tenant, err
}

func (r *tenantRepository) FindByEmail(email string) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.Where("email = ? AND deleted_at IS NULL", email).First(&tenant).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &tenant, err
}

func (r *tenantRepository) FindAll() ([]models.Tenant, error) {
	var tenants []models.Tenant
	err := r.db.Where("deleted_at IS NULL").Find(&tenants).Error
	return tenants, err
}

func (r *tenantRepository) Update(tenant *models.Tenant) error {
	return r.db.Save(tenant).Error
}

func (r *tenantRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.Tenant{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *tenantRepository) FindByEmailIncludeDeleted(email string) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.Where("email = ?", email).First(&tenant).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &tenant, err
}

func (r *tenantRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&models.Tenant{}).
		Where("id = ?", id).
		Update("deleted_at", nil).Error
}
