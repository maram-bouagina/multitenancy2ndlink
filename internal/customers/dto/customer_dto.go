package dto

import "github.com/google/uuid"

// ── Auth DTOs ────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email     string  `json:"email"      validate:"required,email,max=255"`
	Password  string  `json:"password"   validate:"required,min=8,max=128"`
	FirstName string  `json:"first_name" validate:"required,max=100"`
	LastName  string  `json:"last_name"  validate:"required,max=100"`
	Phone     *string `json:"phone"      validate:"omitempty,max=20"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"        validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8,max=128"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password"     validate:"required,min=8,max=128"`
}

// ── Profile DTOs ─────────────────────────────────────────────────────────────

type UpdateProfileRequest struct {
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name"  validate:"omitempty,max=100"`
	Phone     *string `json:"phone"      validate:"omitempty,max=20"`
	Avatar    *string `json:"avatar"     validate:"omitempty"`
}

type CustomerResponse struct {
	ID               string  `json:"id"`
	Email            string  `json:"email"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Phone            *string `json:"phone"`
	Avatar           *string `json:"avatar"`
	Status           string  `json:"status"`
	EmailVerified    bool    `json:"email_verified"`
	TwoFactorEnabled bool    `json:"two_factor_enabled"`
	AcceptsMarketing bool    `json:"accepts_marketing"`
	CreatedAt        string  `json:"created_at"`
}

// ── Address DTOs ─────────────────────────────────────────────────────────────

type CreateAddressRequest struct {
	Label      string  `json:"label"       validate:"omitempty,max=50"`
	FirstName  string  `json:"first_name"  validate:"required,max=100"`
	LastName   string  `json:"last_name"   validate:"required,max=100"`
	Company    *string `json:"company"     validate:"omitempty,max=255"`
	Address1   string  `json:"address1"    validate:"required,max=500"`
	Address2   *string `json:"address2"    validate:"omitempty,max=500"`
	City       string  `json:"city"        validate:"required,max=100"`
	State      *string `json:"state"       validate:"omitempty,max=100"`
	PostalCode string  `json:"postal_code" validate:"required,max=20"`
	Country    string  `json:"country"     validate:"required,max=100"`
	Phone      *string `json:"phone"       validate:"omitempty,max=20"`
	IsDefault  bool    `json:"is_default"`
}

type UpdateAddressRequest = CreateAddressRequest

// ── Privacy DTOs ────────────────────────────────────────────────────────────

type PrivacySettingsRequest struct {
	AcceptsMarketing bool `json:"accepts_marketing"`
}

// ── Admin DTOs ──────────────────────────────────────────────────────────────

type AdminUpdateCustomerRequest struct {
	Status    *string `json:"status"     validate:"omitempty,oneof=active pending suspended"`
	FirstName *string `json:"first_name" validate:"omitempty,max=100"`
	LastName  *string `json:"last_name"  validate:"omitempty,max=100"`
	Phone     *string `json:"phone"      validate:"omitempty,max=20"`
}

// ── Customer Group DTOs ─────────────────────────────────────────────────────

type CreateCustomerGroupRequest struct {
	Name        string  `json:"name"        validate:"required,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
	Discount    float64 `json:"discount"    validate:"min=0,max=100"`
}

type UpdateCustomerGroupRequest = CreateCustomerGroupRequest

type CustomerGroupResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Discount    float64   `json:"discount"`
	MemberCount int64     `json:"member_count"`
	CreatedAt   string    `json:"created_at"`
}

type AddGroupMembersRequest struct {
	CustomerIDs []string `json:"customer_ids" validate:"required,min=1"`
}

type RemoveGroupMembersRequest = AddGroupMembersRequest
