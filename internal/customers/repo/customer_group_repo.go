package repo

import (
	"multitenancypfe/internal/customers/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomerGroupRepo struct{}

func NewCustomerGroupRepo() *CustomerGroupRepo { return &CustomerGroupRepo{} }

func (r *CustomerGroupRepo) List(db *gorm.DB, storeID uuid.UUID) ([]models.CustomerGroup, error) {
	var groups []models.CustomerGroup
	err := db.Where("store_id = ?", storeID).Order("name ASC").Find(&groups).Error
	return groups, err
}

func (r *CustomerGroupRepo) FindByID(db *gorm.DB, id uuid.UUID) (*models.CustomerGroup, error) {
	var g models.CustomerGroup
	err := db.Where("id = ?", id).First(&g).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &g, err
}

func (r *CustomerGroupRepo) Create(db *gorm.DB, g *models.CustomerGroup) error {
	return db.Create(g).Error
}

func (r *CustomerGroupRepo) Update(db *gorm.DB, g *models.CustomerGroup) error {
	return db.Save(g).Error
}

func (r *CustomerGroupRepo) Delete(db *gorm.DB, id uuid.UUID) error {
	// Delete memberships first
	if err := db.Where("customer_group_id = ?", id).Delete(&models.CustomerGroupMember{}).Error; err != nil {
		return err
	}
	return db.Where("id = ?", id).Delete(&models.CustomerGroup{}).Error
}

func (r *CustomerGroupRepo) MemberCount(db *gorm.DB, groupID uuid.UUID) (int64, error) {
	var count int64
	err := db.Model(&models.CustomerGroupMember{}).Where("customer_group_id = ?", groupID).Count(&count).Error
	return count, err
}

func (r *CustomerGroupRepo) ListMembers(db *gorm.DB, groupID uuid.UUID) ([]models.Customer, error) {
	var customers []models.Customer
	err := db.Table("clients").
		Joins("JOIN customer_group_members ON customer_group_members.customer_id = clients.id").
		Where("customer_group_members.customer_group_id = ?", groupID).
		Find(&customers).Error
	return customers, err
}

func (r *CustomerGroupRepo) AddMembers(db *gorm.DB, groupID uuid.UUID, customerIDs []string) error {
	for _, cid := range customerIDs {
		member := models.CustomerGroupMember{
			CustomerGroupID: groupID,
			CustomerID:      cid,
		}
		// Use FirstOrCreate to avoid duplicate inserts
		if err := db.Where("customer_group_id = ? AND customer_id = ?", groupID, cid).
			FirstOrCreate(&member).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *CustomerGroupRepo) RemoveMembers(db *gorm.DB, groupID uuid.UUID, customerIDs []string) error {
	return db.Where("customer_group_id = ? AND customer_id IN ?", groupID, customerIDs).
		Delete(&models.CustomerGroupMember{}).Error
}
