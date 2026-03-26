package services

import (
	"errors"

	"golang.org/x/crypto/bcrypt"

	"multitenancypfe/internal/auth/dto"
	"multitenancypfe/internal/auth/models"
	"multitenancypfe/internal/auth/repo"
	"multitenancypfe/internal/database"
	"multitenancypfe/internal/jwt"
)

// ─── CRUD ─────────────────────────────────────────────────────────────────────

type TenantService interface {
	Create(req dto.CreateTenantRequest) (*dto.TenantResponse, error)
	GetByID(id string) (*dto.TenantResponse, error)
	GetAll() ([]dto.TenantResponse, error)
	Update(id string, req dto.UpdateTenantRequest) (*dto.TenantResponse, error)
	Delete(id string) error
	Restore(id string) error
}

type tenantService struct {
	repo repo.TenantRepository
}

func NewTenantService(r repo.TenantRepository) TenantService {
	return &tenantService{repo: r}
}

func (s *tenantService) Create(req dto.CreateTenantRequest) (*dto.TenantResponse, error) {
	existing, err := s.repo.FindByEmailIncludeDeleted(req.Email)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		// email existe mais compte actif
		if existing.DeletedAt == nil {
			return nil, errors.New("email already in use")
		}
		// email existe mais compte supprimé → réactiver
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		existing.PasswordHash = string(hash)
		existing.FirstName = req.FirstName
		existing.LastName = req.LastName
		existing.Phone = req.Phone
		existing.Plan = req.Plan
		existing.Status = "pending"
		existing.DeletedAt = nil
		if err := s.repo.Update(existing); err != nil {
			return nil, err
		}
		return toTenantResponse(existing), nil
	}

	// email n'existe pas → créer normalement
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tenant := &models.Tenant{
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		Plan:         req.Plan,
		Status:       "pending",
	}
	if err := s.repo.Create(tenant); err != nil {
		return nil, err
	}

	if err := database.CreateTenantSchema(tenant.ID); err != nil {
		return nil, err
	}

	return toTenantResponse(tenant), nil
}
func (s *tenantService) GetByID(id string) (*dto.TenantResponse, error) {
	tenant, err := s.findOrFail(id)
	if err != nil {
		return nil, err
	}
	return toTenantResponse(tenant), nil
}

func (s *tenantService) GetAll() ([]dto.TenantResponse, error) {
	tenants, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	result := make([]dto.TenantResponse, len(tenants))
	for i, t := range tenants {
		result[i] = *toTenantResponse(&t)
	}
	return result, nil
}

func (s *tenantService) Update(id string, req dto.UpdateTenantRequest) (*dto.TenantResponse, error) {
	tenant, err := s.findOrFail(id)
	if err != nil {
		return nil, err
	}

	if req.FirstName != nil {
		tenant.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		tenant.LastName = *req.LastName
	}
	if req.Phone != nil {
		tenant.Phone = req.Phone
	}
	if req.Avatar != nil {
		tenant.Avatar = req.Avatar
	}
	if req.Plan != nil {
		tenant.Plan = *req.Plan
	}
	if req.Status != nil {
		tenant.Status = *req.Status
	}

	if err := s.repo.Update(tenant); err != nil {
		return nil, err
	}
	return toTenantResponse(tenant), nil
}

func (s *tenantService) Delete(id string) error {
	if _, err := s.findOrFail(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

type TenantAuthService interface {
	Login(req dto.LoginRequest) (*dto.LoginResponse, error)
	GetTenantByID(id string) (*dto.TenantResponse, error)
}

type tenantAuthService struct {
	repo repo.TenantRepository
}

func NewTenantAuthService(r repo.TenantRepository) TenantAuthService {
	return &tenantAuthService{repo: r}
}

func (s *tenantAuthService) Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	tenant, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if tenant == nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(tenant.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	token, err := jwt.Generate(tenant.ID, "tenant")
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		Token:  token,
		Tenant: *toTenantResponse(tenant),
	}, nil
}

func (s *tenantAuthService) GetTenantByID(id string) (*dto.TenantResponse, error) {
	tenant, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if tenant == nil {
		return nil, errors.New("tenant not found")
	}

	return toTenantResponse(tenant), nil
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func (s *tenantService) findOrFail(id string) (*models.Tenant, error) {
	tenant, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if tenant == nil {
		return nil, errors.New("tenant not found")
	}
	return tenant, nil
}

func toTenantResponse(t *models.Tenant) *dto.TenantResponse {
	return &dto.TenantResponse{
		ID:            t.ID,
		Email:         t.Email,
		FirstName:     t.FirstName,
		LastName:      t.LastName,
		Phone:         t.Phone,
		Avatar:        t.Avatar,
		Plan:          t.Plan,
		Status:        t.Status,
		EmailVerified: t.EmailVerified,
	}
}

func (s *tenantService) Restore(id string) error {
	return s.repo.Restore(id)
}
