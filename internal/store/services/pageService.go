package services

import (
	"errors"
	"multitenancypfe/internal/store/dto"
	"multitenancypfe/internal/store/models"
	"multitenancypfe/internal/store/repo"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PageService interface {
	List(db *gorm.DB, storeID uuid.UUID) ([]dto.PageResponse, error)
	ListPublic(db *gorm.DB, storeID uuid.UUID) ([]dto.PagePublicListItem, error)
	GetByID(db *gorm.DB, id, storeID uuid.UUID) (*dto.PageResponse, error)
	GetBySlug(db *gorm.DB, slug string, storeID uuid.UUID) (*dto.PagePublicResponse, error)
	Create(db *gorm.DB, storeID uuid.UUID, req dto.CreatePageRequest) (*dto.PageResponse, error)
	Update(db *gorm.DB, id, storeID uuid.UUID, req dto.UpdatePageRequest) (*dto.PageResponse, error)
	Publish(db *gorm.DB, id, storeID uuid.UUID) (*dto.PageResponse, error)
	Delete(db *gorm.DB, id, storeID uuid.UUID) error
}

type pageService struct{ repo repo.PageRepository }

func NewPageService(r repo.PageRepository) PageService { return &pageService{repo: r} }

func (s *pageService) List(db *gorm.DB, storeID uuid.UUID) ([]dto.PageResponse, error) {
	pages, err := s.repo.FindByStoreID(db, storeID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PageResponse, len(pages))
	for i, p := range pages {
		out[i] = toPageResponse(&p)
	}
	return out, nil
}

func (s *pageService) ListPublic(db *gorm.DB, storeID uuid.UUID) ([]dto.PagePublicListItem, error) {
	pages, err := s.repo.FindPublishedByStoreID(db, storeID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PagePublicListItem, len(pages))
	for i, p := range pages {
		out[i] = dto.PagePublicListItem{Slug: p.Slug, Title: p.Title}
	}
	return out, nil
}

func (s *pageService) GetByID(db *gorm.DB, id, storeID uuid.UUID) (*dto.PageResponse, error) {
	page, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}
	r := toPageResponse(page)
	return &r, nil
}

func (s *pageService) GetBySlug(db *gorm.DB, slug string, storeID uuid.UUID) (*dto.PagePublicResponse, error) {
	page, err := s.repo.FindBySlug(db, slug, storeID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("page not found")
	}
	return &dto.PagePublicResponse{
		Slug:            page.Slug,
		Title:           page.Title,
		LayoutPublished: page.LayoutPublished,
		MetaTitle:       page.MetaTitle,
		MetaDesc:        page.MetaDesc,
	}, nil
}

func (s *pageService) Create(db *gorm.DB, storeID uuid.UUID, req dto.CreatePageRequest) (*dto.PageResponse, error) {
	// Check slug uniqueness
	existing, err := s.repo.FindBySlug(db, req.Slug, storeID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("a page with this slug already exists")
	}

	layout := defaultLayoutForType(req.Type)
	page := &models.StorefrontPage{
		StoreID:         storeID,
		Type:            req.Type,
		Title:           req.Title,
		Slug:            req.Slug,
		LayoutDraft:     layout,
		LayoutPublished: layout,
		Status:          "published",
	}
	if err := s.repo.Create(db, page); err != nil {
		return nil, err
	}
	r := toPageResponse(page)
	return &r, nil
}

func (s *pageService) Update(db *gorm.DB, id, storeID uuid.UUID, req dto.UpdatePageRequest) (*dto.PageResponse, error) {
	page, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}
	if req.Title != nil {
		page.Title = *req.Title
	}
	if req.LayoutDraft != nil {
		page.LayoutDraft = *req.LayoutDraft
	}
	if req.Status != nil {
		page.Status = *req.Status
	}
	if req.MetaTitle != nil {
		page.MetaTitle = req.MetaTitle
	}
	if req.MetaDesc != nil {
		page.MetaDesc = req.MetaDesc
	}
	if err := s.repo.Update(db, page); err != nil {
		return nil, err
	}
	r := toPageResponse(page)
	return &r, nil
}

func (s *pageService) Publish(db *gorm.DB, id, storeID uuid.UUID) (*dto.PageResponse, error) {
	page, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return nil, err
	}
	page.LayoutPublished = page.LayoutDraft
	page.Status = "published"
	if err := s.repo.Update(db, page); err != nil {
		return nil, err
	}
	r := toPageResponse(page)
	return &r, nil
}

func (s *pageService) Delete(db *gorm.DB, id, storeID uuid.UUID) error {
	page, err := s.findOrFail(db, id, storeID)
	if err != nil {
		return err
	}
	// Home page is indestructible
	if page.Slug == "index" && page.Type == "home" {
		return errors.New("the home page cannot be deleted")
	}
	return s.repo.Delete(db, id)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func (s *pageService) findOrFail(db *gorm.DB, id, storeID uuid.UUID) (*models.StorefrontPage, error) {
	page, err := s.repo.FindByID(db, id, storeID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, errors.New("page not found")
	}
	return page, nil
}

func defaultLayoutForType(t string) string {
	switch t {
	case "promo":
		return models.DefaultPromoLayout
	case "blog":
		return models.DefaultBlogLayout
	case "info":
		return models.DefaultAboutLayout
	default:
		return models.DefaultHomeLayout
	}
}

func toPageResponse(p *models.StorefrontPage) dto.PageResponse {
	return dto.PageResponse{
		ID:              p.ID.String(),
		StoreID:         p.StoreID.String(),
		Type:            p.Type,
		Title:           p.Title,
		Slug:            p.Slug,
		LayoutDraft:     p.LayoutDraft,
		LayoutPublished: p.LayoutPublished,
		Status:          p.Status,
		MetaTitle:       p.MetaTitle,
		MetaDesc:        p.MetaDesc,
		CreatedAt:       p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:       p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
