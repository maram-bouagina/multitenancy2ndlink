package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	"multitenancypfe/internal/customers/repo"
	"multitenancypfe/internal/jwt"
)

type CustomerAuthService struct {
	repo *repo.CustomerRepo
}

func NewCustomerAuthService(r *repo.CustomerRepo) *CustomerAuthService {
	return &CustomerAuthService{repo: r}
}

// CustomerClaims wraps the JWT with customer-specific context.
// The jwt.Generate already creates a token with userID + role.
// We use role = "customer" to differentiate.

// Register creates a new customer account for a given store.
func (s *CustomerAuthService) Register(db *gorm.DB, storeID uuid.UUID, req dto.RegisterRequest) (*models.Customer, string, error) {
	existing, err := s.repo.FindByEmail(db, storeID, req.Email)
	if err != nil {
		return nil, "", err
	}
	if existing != nil {
		return nil, "", errors.New("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}

	verifyToken := generateSecureToken()
	verifyExp := time.Now().Add(24 * time.Hour)

	customer := &models.Customer{
		StoreID:          storeID,
		Email:            req.Email,
		PasswordHash:     string(hash),
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Phone:            req.Phone,
		Status:           "pending",
		EmailVerified:    false,
		EmailVerifyToken: &verifyToken,
		EmailVerifyExp:   &verifyExp,
	}

	if err := s.repo.Create(db, customer); err != nil {
		return nil, "", err
	}

	return customer, verifyToken, nil
}

// Login authenticates a customer and returns a JWT token.
func (s *CustomerAuthService) Login(db *gorm.DB, storeID uuid.UUID, req dto.LoginRequest) (*models.Customer, string, error) {
	customer, err := s.repo.FindByEmail(db, storeID, req.Email)
	if err != nil {
		return nil, "", err
	}
	if customer == nil {
		return nil, "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(customer.PasswordHash), []byte(req.Password)); err != nil {
		return nil, "", errors.New("invalid credentials")
	}

	if customer.Status == "suspended" {
		return nil, "", errors.New("account suspended")
	}

	// Update last login
	now := time.Now()
	customer.LastLoginAt = &now
	_ = s.repo.Update(db, customer)

	// Generate JWT with role="customer"
	token, err := jwt.Generate(customer.ID, "customer")
	if err != nil {
		return nil, "", err
	}

	return customer, token, nil
}

// VerifyEmail confirms a customer's email address.
func (s *CustomerAuthService) VerifyEmail(db *gorm.DB, token string) error {
	customer, err := s.repo.FindByVerifyToken(db, token)
	if err != nil {
		return err
	}
	if customer == nil {
		return errors.New("invalid or expired token")
	}
	if customer.EmailVerifyExp != nil && customer.EmailVerifyExp.Before(time.Now()) {
		return errors.New("token expired")
	}

	customer.EmailVerified = true
	customer.Status = "active"
	customer.EmailVerifyToken = nil
	customer.EmailVerifyExp = nil
	return s.repo.Update(db, customer)
}

// ForgotPassword generates a password reset token.
func (s *CustomerAuthService) ForgotPassword(db *gorm.DB, storeID uuid.UUID, email string) (string, error) {
	customer, err := s.repo.FindByEmail(db, storeID, email)
	if err != nil {
		return "", err
	}
	if customer == nil {
		// Return no error to prevent email enumeration
		return "", nil
	}

	resetToken := generateSecureToken()
	resetExp := time.Now().Add(1 * time.Hour)
	customer.ResetToken = &resetToken
	customer.ResetTokenExp = &resetExp

	if err := s.repo.Update(db, customer); err != nil {
		return "", err
	}
	return resetToken, nil
}

// ResetPassword sets a new password using a valid reset token.
func (s *CustomerAuthService) ResetPassword(db *gorm.DB, req dto.ResetPasswordRequest) error {
	customer, err := s.repo.FindByResetToken(db, req.Token)
	if err != nil {
		return err
	}
	if customer == nil {
		return errors.New("invalid or expired token")
	}
	if customer.ResetTokenExp != nil && customer.ResetTokenExp.Before(time.Now()) {
		return errors.New("token expired")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	customer.PasswordHash = string(hash)
	customer.ResetToken = nil
	customer.ResetTokenExp = nil
	return s.repo.Update(db, customer)
}

// ChangePassword updates the password for an authenticated customer.
func (s *CustomerAuthService) ChangePassword(db *gorm.DB, customerID string, req dto.ChangePasswordRequest) error {
	customer, err := s.repo.FindByID(db, customerID)
	if err != nil {
		return err
	}
	if customer == nil {
		return errors.New("customer not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(customer.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	customer.PasswordHash = string(hash)
	return s.repo.Update(db, customer)
}

func generateSecureToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
