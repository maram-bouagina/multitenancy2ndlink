package services

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	authRepo "multitenancypfe/internal/auth/repo"
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
	repo       repo.StoreRepository
	tenantRepo authRepo.TenantRepository
	pageRepo   repo.PageRepository
}

func NewStoreService(r repo.StoreRepository, tr authRepo.TenantRepository, pr repo.PageRepository) StoreService {
	return &storeService{repo: r, tenantRepo: tr, pageRepo: pr}
}

func (s *storeService) Create(db *gorm.DB, tenantID string, req dto.CreateStoreRequest) (*dto.StoreResponse, error) {
	// check slug uniqueness
	existing, err := s.repo.FindBySlug(db, req.Slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("slug already in use")
	}

	// TODO: re-enable once upgrade flow is implemented
	// fetch tenant plan and enforce store limit
	// plan, err := s.tenantRepo.FindPlan(tenantID)
	// if err != nil {
	// 	return nil, err
	// }
	// limits := plans.Get(plan)

	// existingStores, err := s.repo.FindByTenantID(db, tenantID)
	// if err != nil {
	// 	return nil, err
	// }
	// if !limits.CanCreateStore(len(existingStores)) {
	// 	return nil, fmt.Errorf(
	// 		"your %s plan allows a maximum of %d store(s). Upgrade your plan to create more.",
	// 		plan, limits.MaxStores,
	// 	)
	// }

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
	s.seedDefaultPages(db, store.ID)
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
func (s *storeService) seedDefaultPages(db *gorm.DB, storeID uuid.UUID) {
	defaults := []struct {
		typ, title, slug, layout string
	}{
		{"home", "Accueil", "index", models.DefaultHomeLayout},
		{"promo", "Promotions", "promotions", models.DefaultPromoLayout},
		{"blog", "Blog", "blog", models.DefaultBlogLayout},
		{"info", "À propos", "a-propos", models.DefaultAboutLayout},
		{"info", "Contact", "contact", models.DefaultContactLayout},
		{"info", "Mentions légales", "mentions-legales", models.DefaultLegalLayout},
	}
	for _, d := range defaults {
		page := &models.StorefrontPage{
			StoreID:         storeID,
			Type:            d.typ,
			Title:           d.title,
			Slug:            d.slug,
			LayoutDraft:     d.layout,
			LayoutPublished: d.layout,
			Status:          "published",
		}
		_ = s.pageRepo.Create(db, page) // best-effort, non-blocking
	}
}
