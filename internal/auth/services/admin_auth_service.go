package services

import (
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"multitenancypfe/internal/auth/dto"
	"multitenancypfe/internal/auth/models"
	"multitenancypfe/internal/auth/repo"
)

type AdminService interface {
	Create(req dto.CreateAdminRequest) (*dto.AdminResponse, error)
	GetByID(id uuid.UUID) (*dto.AdminResponse, error)
	GetAll() ([]dto.AdminResponse, error)
	Update(id uuid.UUID, req dto.UpdateAdminRequest) (*dto.AdminResponse, error)
	Delete(id uuid.UUID) error
}

type adminService struct {
	repo repo.AdminRepository
}

func NewAdminService(r repo.AdminRepository) AdminService {
	return &adminService{repo: r}
}

func (s *adminService) Create(req dto.CreateAdminRequest) (*dto.AdminResponse, error) {
	existing, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email already in use")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	admin := &models.PlatformAdmin{
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		Status:       "active",
	}
	if err := s.repo.Create(admin); err != nil {
		return nil, err
	}
	return toAdminResponse(admin), nil
}

func (s *adminService) GetByID(id uuid.UUID) (*dto.AdminResponse, error) {
	admin, err := s.findOrFail(id)
	if err != nil {
		return nil, err
	}
	return toAdminResponse(admin), nil
}

func (s *adminService) GetAll() ([]dto.AdminResponse, error) {
	admins, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	result := make([]dto.AdminResponse, len(admins))
	for i, a := range admins {
		result[i] = *toAdminResponse(&a)
	}
	return result, nil
}

func (s *adminService) Update(id uuid.UUID, req dto.UpdateAdminRequest) (*dto.AdminResponse, error) {
	admin, err := s.findOrFail(id)
	if err != nil {
		return nil, err
	}

	if req.FirstName != nil {
		admin.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		admin.LastName = *req.LastName
	}
	if req.Role != nil {
		admin.Role = *req.Role
	}
	if req.Status != nil {
		admin.Status = *req.Status
	}

	if err := s.repo.Update(admin); err != nil {
		return nil, err
	}
	return toAdminResponse(admin), nil
}

func (s *adminService) Delete(id uuid.UUID) error {
	if _, err := s.findOrFail(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func (s *adminService) findOrFail(id uuid.UUID) (*models.PlatformAdmin, error) {
	admin, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if admin == nil {
		return nil, errors.New("admin not found")
	}
	return admin, nil
}

func toAdminResponse(a *models.PlatformAdmin) *dto.AdminResponse {
	return &dto.AdminResponse{
		ID:        a.ID.String(),
		Email:     a.Email,
		FirstName: a.FirstName,
		LastName:  a.LastName,
		Role:      a.Role,
		Status:    a.Status,
	}
}
