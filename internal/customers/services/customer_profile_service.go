package services

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	"multitenancypfe/internal/customers/repo"
)

type CustomerProfileService struct {
	repo *repo.CustomerRepo
}

func NewCustomerProfileService(r *repo.CustomerRepo) *CustomerProfileService {
	return &CustomerProfileService{repo: r}
}

// GetProfile returns customer profile data.
func (s *CustomerProfileService) GetProfile(db *gorm.DB, customerID string) (*models.Customer, error) {
	return s.repo.FindByID(db, customerID)
}

// UpdateProfile updates name, phone, etc.
func (s *CustomerProfileService) UpdateProfile(db *gorm.DB, customerID string, req dto.UpdateProfileRequest) (*models.Customer, error) {
	customer, err := s.repo.FindByID(db, customerID)
	if err != nil {
		return nil, err
	}
	if customer == nil {
		return nil, gorm.ErrRecordNotFound
	}

	if req.FirstName != nil {
		customer.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		customer.LastName = *req.LastName
	}
	if req.Phone != nil {
		customer.Phone = req.Phone
	}
	if req.Avatar != nil {
		customer.Avatar = req.Avatar
	}

	if err := s.repo.Update(db, customer); err != nil {
		return nil, err
	}
	return customer, nil
}

// UpdatePrivacy updates marketing/communication preferences.
func (s *CustomerProfileService) UpdatePrivacy(db *gorm.DB, customerID string, req dto.PrivacySettingsRequest) error {
	customer, err := s.repo.FindByID(db, customerID)
	if err != nil {
		return err
	}
	if customer == nil {
		return gorm.ErrRecordNotFound
	}
	customer.AcceptsMarketing = req.AcceptsMarketing
	return s.repo.Update(db, customer)
}

// DeleteAccount soft-deletes the customer account (right to be forgotten).
func (s *CustomerProfileService) DeleteAccount(db *gorm.DB, customerID string) error {
	return s.repo.Delete(db, customerID)
}

// ── Addresses ────────────────────────────────────────────────────────────────

func (s *CustomerProfileService) ListAddresses(db *gorm.DB, customerID string) ([]models.CustomerAddress, error) {
	return s.repo.ListAddresses(db, customerID)
}

func (s *CustomerProfileService) CreateAddress(db *gorm.DB, customerID string, storeID uuid.UUID, req dto.CreateAddressRequest) (*models.CustomerAddress, error) {
	if req.IsDefault {
		_ = s.repo.ClearDefaultAddresses(db, customerID)
	}

	label := req.Label
	if label == "" {
		label = "home"
	}

	addr := &models.CustomerAddress{
		CustomerID: customerID,
		StoreID:    storeID,
		Label:      label,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Company:    req.Company,
		Address1:   req.Address1,
		Address2:   req.Address2,
		City:       req.City,
		State:      req.State,
		PostalCode: req.PostalCode,
		Country:    req.Country,
		Phone:      req.Phone,
		IsDefault:  req.IsDefault,
	}

	if err := s.repo.CreateAddress(db, addr); err != nil {
		return nil, err
	}
	return addr, nil
}

func (s *CustomerProfileService) UpdateAddress(db *gorm.DB, addrID uuid.UUID, customerID string, storeID uuid.UUID, req dto.UpdateAddressRequest) (*models.CustomerAddress, error) {
	addr, err := s.repo.FindAddress(db, addrID, customerID)
	if err != nil {
		return nil, err
	}
	if addr == nil {
		return nil, gorm.ErrRecordNotFound
	}

	if req.IsDefault && !addr.IsDefault {
		_ = s.repo.ClearDefaultAddresses(db, customerID)
	}

	addr.Label = req.Label
	addr.FirstName = req.FirstName
	addr.LastName = req.LastName
	addr.Company = req.Company
	addr.Address1 = req.Address1
	addr.Address2 = req.Address2
	addr.City = req.City
	addr.State = req.State
	addr.PostalCode = req.PostalCode
	addr.Country = req.Country
	addr.Phone = req.Phone
	addr.IsDefault = req.IsDefault

	if err := s.repo.UpdateAddress(db, addr); err != nil {
		return nil, err
	}
	return addr, nil
}

func (s *CustomerProfileService) DeleteAddress(db *gorm.DB, addrID uuid.UUID, customerID string) error {
	return s.repo.DeleteAddress(db, addrID, customerID)
}
