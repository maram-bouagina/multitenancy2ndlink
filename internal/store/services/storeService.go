package services

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/store/dto"
	"multitenancypfe/internal/store/models"
	"multitenancypfe/internal/store/repo"
	sfRepo "multitenancypfe/internal/storefront/repo"
)

type StoreService interface {
	Create(db *gorm.DB, tenantID string, req dto.CreateStoreRequest) (*dto.StoreResponse, error)
	GetByID(db *gorm.DB, id uuid.UUID) (*dto.StoreResponse, error)
	GetByTenantID(db *gorm.DB, tenantID string) ([]dto.StoreResponse, error)
	Update(db *gorm.DB, id uuid.UUID, req dto.UpdateStoreRequest) (*dto.StoreResponse, error)
	UpdateStatus(db *gorm.DB, id uuid.UUID, req dto.UpdateStoreStatusRequest) (*dto.StoreResponse, error)
	PublishCustomization(db *gorm.DB, id uuid.UUID, req dto.PublishStoreCustomizationRequest) (*dto.StoreResponse, error)
	Delete(db *gorm.DB, id uuid.UUID) error
}

type storeService struct {
	repo repo.StoreRepository
}

func NewStoreService(r repo.StoreRepository) StoreService {
	return &storeService{repo: r}
}

func (s *storeService) Create(db *gorm.DB, tenantID string, req dto.CreateStoreRequest) (*dto.StoreResponse, error) {
	existing, err := s.repo.FindBySlug(db, req.Slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("slug already in use")
	}

	existingStores, err := s.repo.FindByTenantID(db, tenantID)
	if err != nil {
		return nil, err
	}
	if len(existingStores) > 0 {
		return nil, errors.New("tenant already has a store")
	}

	store := &models.Store{
		TenantID:                  tenantID,
		Name:                      req.Name,
		Slug:                      req.Slug,
		Email:                     req.Email,
		Phone:                     req.Phone,
		Address:                   req.Address,
		Logo:                      req.Logo,
		Currency:                  req.Currency,
		Timezone:                  req.Timezone,
		Language:                  req.Language,
		ThemePrimaryColor:         "#2563eb",
		ThemeSecondaryColor:       "#0f172a",
		ThemeMode:                 "light",
		ThemeFontFamily:           "Inter",
		StorefrontLayoutDraft:     "[]",
		StorefrontLayoutPublished: "[]",
		ThemeVersion:              1,
		TaxNumber:                 req.TaxNumber,
		MaintenanceMessage:        req.MaintenanceMessage,
		Status:                    "active",
	}
	if req.ThemePrimaryColor != nil && *req.ThemePrimaryColor != "" {
		store.ThemePrimaryColor = *req.ThemePrimaryColor
	}
	if req.ThemeSecondaryColor != nil && *req.ThemeSecondaryColor != "" {
		store.ThemeSecondaryColor = *req.ThemeSecondaryColor
	}
	if req.ThemeMode != nil && *req.ThemeMode != "" {
		store.ThemeMode = *req.ThemeMode
	}
	if req.ThemeFontFamily != nil && *req.ThemeFontFamily != "" {
		store.ThemeFontFamily = *req.ThemeFontFamily
	}
	if req.StorefrontLayoutDraft != nil {
		store.StorefrontLayoutDraft = *req.StorefrontLayoutDraft
		store.StorefrontLayoutPublished = *req.StorefrontLayoutDraft
	}
	if err := s.repo.Create(db, store); err != nil {
		return nil, err
	}
	// Register slug in the public routing index (best-effort; non-blocking)
	_ = sfRepo.UpsertSlug(store.Slug, store.TenantID, store.ID, store.Status)
	return toStoreResponse(store), nil
}

func (s *storeService) GetByID(db *gorm.DB, id uuid.UUID) (*dto.StoreResponse, error) {
	store, err := s.findOrFail(db, id)
	if err != nil {
		return nil, err
	}
	return toStoreResponse(store), nil
}

func (s *storeService) GetByTenantID(db *gorm.DB, tenantID string) ([]dto.StoreResponse, error) {
	stores, err := s.repo.FindByTenantID(db, tenantID)
	if err != nil {
		return nil, err
	}
	result := make([]dto.StoreResponse, len(stores))
	for i, st := range stores {
		result[i] = *toStoreResponse(&st)
	}
	return result, nil
}

func (s *storeService) Update(db *gorm.DB, id uuid.UUID, req dto.UpdateStoreRequest) (*dto.StoreResponse, error) {
	store, err := s.findOrFail(db, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		store.Name = *req.Name
	}
	if req.Email != nil {
		store.Email = req.Email
	}
	if req.Phone != nil {
		store.Phone = req.Phone
	}
	if req.Address != nil {
		store.Address = req.Address
	}
	if req.Logo != nil {
		store.Logo = req.Logo
	}
	if req.Currency != nil {
		store.Currency = *req.Currency
	}
	if req.Timezone != nil {
		store.Timezone = *req.Timezone
	}
	if req.Language != nil {
		store.Language = *req.Language
	}
	if req.ThemePrimaryColor != nil {
		store.ThemePrimaryColor = *req.ThemePrimaryColor
	}
	if req.ThemeSecondaryColor != nil {
		store.ThemeSecondaryColor = *req.ThemeSecondaryColor
	}
	if req.ThemeMode != nil {
		store.ThemeMode = *req.ThemeMode
	}
	if req.ThemeFontFamily != nil {
		store.ThemeFontFamily = *req.ThemeFontFamily
	}
	if req.StorefrontLayoutDraft != nil {
		store.StorefrontLayoutDraft = *req.StorefrontLayoutDraft
	}
	if req.TaxNumber != nil {
		store.TaxNumber = req.TaxNumber
	}
	if req.MaintenanceMessage != nil {
		store.MaintenanceMessage = req.MaintenanceMessage
	}
	if req.Status != nil {
		store.Status = *req.Status
	}

	if err := s.repo.Update(db, store); err != nil {
		return nil, err
	}
	// Keep slug index in sync (status or other indexed fields may have changed)
	_ = sfRepo.UpsertSlug(store.Slug, store.TenantID, store.ID, store.Status)
	return toStoreResponse(store), nil
}

func (s *storeService) UpdateStatus(db *gorm.DB, id uuid.UUID, req dto.UpdateStoreStatusRequest) (*dto.StoreResponse, error) {
	store, err := s.findOrFail(db, id)
	if err != nil {
		return nil, err
	}
	// Platform admins set "suspended"; merchants cannot override it.
	if store.Status == "suspended" {
		return nil, errors.New("cannot change status of a suspended store")
	}
	store.Status = req.Status
	if err := s.repo.Update(db, store); err != nil {
		return nil, err
	}
	_ = sfRepo.UpsertSlug(store.Slug, store.TenantID, store.ID, store.Status)
	return toStoreResponse(store), nil
}

func (s *storeService) PublishCustomization(db *gorm.DB, id uuid.UUID, req dto.PublishStoreCustomizationRequest) (*dto.StoreResponse, error) {
	store, err := s.findOrFail(db, id)
	if err != nil {
		return nil, err
	}

	useDraftLayout := true
	if req.UseDraftLayout != nil {
		useDraftLayout = *req.UseDraftLayout
	}

	if useDraftLayout {
		store.StorefrontLayoutPublished = store.StorefrontLayoutDraft
	}
	store.ThemeVersion = store.ThemeVersion + 1

	if err := s.repo.Update(db, store); err != nil {
		return nil, err
	}

	return toStoreResponse(store), nil
}

func (s *storeService) Delete(db *gorm.DB, id uuid.UUID) error {
	store, err := s.findOrFail(db, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(db, id); err != nil {
		return err
	}
	// Remove from public routing index
	_ = sfRepo.DeleteSlug(store.Slug)
	return nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func (s *storeService) findOrFail(db *gorm.DB, id uuid.UUID) (*models.Store, error) {
	store, err := s.repo.FindByID(db, id)
	if err != nil {
		return nil, err
	}
	if store == nil {
		return nil, errors.New("store not found")
	}
	return store, nil
}

func toStoreResponse(s *models.Store) *dto.StoreResponse {
	return &dto.StoreResponse{
		ID:                        s.ID.String(),
		TenantID:                  s.TenantID,
		Name:                      s.Name,
		Slug:                      s.Slug,
		Email:                     s.Email,
		Phone:                     s.Phone,
		Address:                   s.Address,
		Logo:                      s.Logo,
		Currency:                  s.Currency,
		Timezone:                  s.Timezone,
		Language:                  s.Language,
		ThemePrimaryColor:         s.ThemePrimaryColor,
		ThemeSecondaryColor:       s.ThemeSecondaryColor,
		ThemeMode:                 s.ThemeMode,
		ThemeFontFamily:           s.ThemeFontFamily,
		StorefrontLayoutDraft:     s.StorefrontLayoutDraft,
		StorefrontLayoutPublished: s.StorefrontLayoutPublished,
		ThemeVersion:              s.ThemeVersion,
		TaxNumber:                 s.TaxNumber,
		MaintenanceMessage:        s.MaintenanceMessage,
		Status:                    s.Status,
	}
}
