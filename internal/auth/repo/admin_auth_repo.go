package repo

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/auth/models"
)

type AdminRepository interface {
	Create(admin *models.PlatformAdmin) error
	FindByID(id uuid.UUID) (*models.PlatformAdmin, error)
	FindByEmail(email string) (*models.PlatformAdmin, error)
	FindAll() ([]models.PlatformAdmin, error)
	Update(admin *models.PlatformAdmin) error
	Delete(id uuid.UUID) error
}

type adminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) Create(admin *models.PlatformAdmin) error {
	return r.db.Create(admin).Error
}

func (r *adminRepository) FindByID(id uuid.UUID) (*models.PlatformAdmin, error) {
	var admin models.PlatformAdmin
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &admin, err
}

func (r *adminRepository) FindByEmail(email string) (*models.PlatformAdmin, error) {
	var admin models.PlatformAdmin
	err := r.db.Where("email = ? AND deleted_at IS NULL", email).First(&admin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &admin, err
}

func (r *adminRepository) FindAll() ([]models.PlatformAdmin, error) {
	var admins []models.PlatformAdmin
	err := r.db.Where("deleted_at IS NULL").Find(&admins).Error
	return admins, err
}

func (r *adminRepository) Update(admin *models.PlatformAdmin) error {
	return r.db.Save(admin).Error
}

func (r *adminRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.PlatformAdmin{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
