package dto

import "github.com/google/uuid"

// ── StoreRole DTOs ────────────────────────────────────────────────────────────

// CreateRoleRequest creates a new custom role for a store
type CreateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=1,max=100"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions" validate:"required"`
}

// UpdateRoleRequest updates an existing custom role
type UpdateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=1,max=100"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions" validate:"required"`
}

// RoleResponse is the API response for a store role
type RoleResponse struct {
	ID          uuid.UUID `json:"id"`
	StoreID     uuid.UUID `json:"store_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	IsSystem    bool      `json:"is_system"`
	MemberCount int64     `json:"member_count"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// ── Invitation DTOs ───────────────────────────────────────────────────────────

// CreateInvitationRequest is the payload for inviting a new member.
// Either StoreRoleID (custom role) or Role (system role) must be set.
type CreateInvitationRequest struct {
	Email       string     `json:"email" validate:"required,email"`
	Role        string     `json:"role" validate:"required,oneof=designer editor viewer"`
	StoreRoleID *uuid.UUID `json:"store_role_id"` // optional custom role override
}

// AcceptInvitationRequest is the payload for accepting an invitation.
// The profile fields are stored per-store in store_members so the invitee
// can present a different identity in each store they collaborate in.
type AcceptInvitationRequest struct {
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
	Bio         string `json:"bio"`
}

// InvitationPreviewResponse is the public (unauthenticated) view of an invitation
type InvitationPreviewResponse struct {
	Email           string `json:"email"`
	Role            string `json:"role"`             // system role fallback key
	RoleName        string `json:"role_name"`        // display name (custom or system)
	RoleDescription string `json:"role_description"` // description (custom or system)
	StoreName       string `json:"store_name"`
	InviterName     string `json:"inviter_name"`
	ExpiresAt       string `json:"expires_at"`
	Status          string `json:"status"`
	UserExists      bool   `json:"user_exists"` // true = account already exists for this email
}

// InvitationResponse represents an invitation
type InvitationResponse struct {
	ID          uuid.UUID     `json:"id"`
	Email       string        `json:"email"`
	Role        string        `json:"role"`
	StoreRoleID *uuid.UUID    `json:"store_role_id"`
	StoreRole   *RoleResponse `json:"store_role,omitempty"`
	Status      string        `json:"status"`
	ExpiresAt   string        `json:"expires_at"`
	CreatedAt   string        `json:"created_at"`
}

// ── Member DTOs ───────────────────────────────────────────────────────────────

// MemberResponse represents a store member
type MemberResponse struct {
	ID          uuid.UUID     `json:"id"`
	UserID      string        `json:"user_id"`
	Email       string        `json:"email"`
	Name        string        `json:"name"`
	DisplayName string        `json:"display_name"`
	Phone       string        `json:"phone"`
	Bio         string        `json:"bio"`
	Role        string        `json:"role"`
	StoreRoleID *uuid.UUID    `json:"store_role_id"`
	StoreRole   *RoleResponse `json:"store_role,omitempty"`
	Permissions []string      `json:"permissions"`
	CreatedAt   string        `json:"created_at"`
}

// UpdateMemberRoleRequest updates a member's system role and/or custom role.
// Set StoreRoleID to a UUID to assign a custom role.
// Set StoreRoleID to nil to use only the system role.
type UpdateMemberRoleRequest struct {
	Role        string     `json:"role" validate:"required,oneof=designer editor viewer"`
	StoreRoleID *uuid.UUID `json:"store_role_id"`
}

// ── User Stores DTOs ──────────────────────────────────────────────────────────

// MyStoresResponse represents the list of stores a user has access to
type MyStoresResponse struct {
	Stores []StoreWithRoleDTO `json:"stores"`
}

// StoreWithRoleDTO includes the store info, user's role, and per-store profile
type StoreWithRoleDTO struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	Slug              string    `json:"slug"`
	Logo              *string   `json:"logo"`
	Role              string    `json:"role"`
	Currency          string    `json:"currency"`
	ThemePrimaryColor string    `json:"theme_primary_color"`
	DisplayName       string    `json:"display_name"`
	StoreRoleName     string    `json:"store_role_name"`
	OwnerName         string    `json:"owner_name"`  // name of the store owner (Better Auth user)
	Permissions       []string  `json:"permissions"` // effective permissions for this membership
}
