package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ── Permission definitions ────────────────────────────────────────────────────

// Permission keys used throughout RBAC checks.
// Format: "<resource>:<action>"
const (
	// Products
	PermProductsCreate       = "products:create"
	PermProductsEdit         = "products:edit"
	PermProductsDelete       = "products:delete"
	PermProductsPublish      = "products:publish"
	PermProductsImportExport = "products:import_export"

	// Categories
	PermCategoriesManage = "categories:manage"

	// Collections
	PermCollectionsManage = "collections:manage"

	// Tags
	PermTagsManage = "tags:manage"

	// Customers
	PermCustomersView         = "customers:view"
	PermCustomersEdit         = "customers:edit"
	PermCustomersDelete       = "customers:delete"
	PermCustomersImportExport = "customers:import_export"

	// Store settings
	PermStoreSettingsEdit  = "store:settings_edit"
	PermStoreMediaUpload   = "store:media_upload"
	PermStoreCustomization = "store:customization"
	PermStorePages         = "store:pages"
	PermStorePublish       = "store:publish"

	// Team management
	PermTeamManage = "team:manage"
)

// AllPermissions is the full catalog shown in the UI
var AllPermissions = []string{
	PermProductsCreate,
	PermProductsEdit,
	PermProductsDelete,
	PermProductsPublish,
	PermProductsImportExport,
	PermCategoriesManage,
	PermCollectionsManage,
	PermTagsManage,
	PermCustomersView,
	PermCustomersEdit,
	PermCustomersDelete,
	PermCustomersImportExport,
	PermStoreSettingsEdit,
	PermStoreMediaUpload,
	PermStoreCustomization,
	PermStorePages,
	PermStorePublish,
	PermTeamManage,
}

// SystemRolePermissions maps the four legacy system roles to their default permissions.
// These are used when a member has no custom role assigned (role_id = nil).
var SystemRolePermissions = map[string][]string{
	"owner": AllPermissions,
	"designer": {
		PermProductsCreate, PermProductsEdit, PermProductsPublish,
		PermCategoriesManage, PermCollectionsManage, PermTagsManage,
		PermStoreMediaUpload, PermStoreCustomization, PermStorePages,
	},
	"editor": {
		PermProductsCreate, PermProductsEdit, PermProductsDelete, PermProductsPublish,
		PermProductsImportExport,
		PermCategoriesManage, PermCollectionsManage, PermTagsManage,
		PermCustomersView, PermCustomersEdit,
		PermCustomersImportExport,
		PermStorePages,
	},
	"viewer": {},
}

// ── StringArray JSON type ─────────────────────────────────────────────────────

// StringArray is a []string stored as JSON in postgres.
type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	b, err := json.Marshal(s)
	return string(b), err
}

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return errors.New("cannot scan StringArray")
	}
	return json.Unmarshal(bytes, s)
}

// ── StoreRole ─────────────────────────────────────────────────────────────────

// StoreRole is a merchant-defined role within a store.
// Lives in the public schema.
type StoreRole struct {
	ID          uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID     uuid.UUID   `gorm:"type:uuid;not null;index" json:"store_id"`
	Name        string      `gorm:"type:varchar(100);not null" json:"name"`
	Description string      `gorm:"type:text" json:"description"`
	Permissions StringArray `gorm:"type:jsonb;not null;default:'[]'" json:"permissions"`
	IsSystem    bool        `gorm:"not null;default:false" json:"is_system"` // true = built-in role, cannot be deleted
	CreatedAt   time.Time   `gorm:"type:timestamptz;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time   `gorm:"type:timestamptz;autoUpdateTime" json:"updated_at"`
	DeletedAt   *time.Time  `gorm:"type:timestamptz;index" json:"-"`
}

func (StoreRole) TableName() string { return "store_roles" }

// ── StoreMember ───────────────────────────────────────────────────────────────

// StoreMember represents a user's membership in a store
// This table lives in the public schema and acts as the routing table
type StoreMember struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID     uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_store_user" json:"store_id"`
	UserID      string     `gorm:"type:varchar(255);not null;uniqueIndex:idx_store_user" json:"user_id"` // Better Auth user.id
	TenantID    string     `gorm:"type:varchar(255);not null;index" json:"tenant_id"`                    // Owner's userID for schema routing
	Role        string     `gorm:"type:varchar(50);not null;default:'viewer'" json:"role"`               // system role fallback
	StoreRoleID *uuid.UUID `gorm:"type:uuid;index" json:"store_role_id"`                                 // nullable custom role FK
	StoreRole   *StoreRole `gorm:"foreignKey:StoreRoleID" json:"store_role,omitempty"`
	// Per-store profile fields — staff can have different identities per store
	DisplayName string     `gorm:"type:varchar(255)" json:"display_name"`
	Phone       string     `gorm:"type:varchar(50)" json:"phone"`
	Bio         string     `gorm:"type:text" json:"bio"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"type:timestamptz;autoUpdateTime" json:"updated_at"`
	DeletedAt   *time.Time `gorm:"type:timestamptz;index" json:"-"`
}

func (StoreMember) TableName() string {
	return "store_members"
}

// HasPermission checks whether this member has the given permission key.
// Owners always have all permissions. For other members, checks the custom
// role first; falls back to the system role permission table.
func (m *StoreMember) HasPermission(permission string) bool {
	if m.Role == "owner" {
		return true
	}
	// Custom role takes precedence
	if m.StoreRole != nil {
		for _, p := range m.StoreRole.Permissions {
			if p == permission {
				return true
			}
		}
		return false
	}
	// Fall back to system role defaults
	perms := SystemRolePermissions[m.Role]
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}

// ── StoreInvitation ───────────────────────────────────────────────────────────

// StoreInvitation represents a pending invitation to join a store
// This table lives in the public schema
type StoreInvitation struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"store_id"`
	Email       string     `gorm:"type:varchar(255);not null" json:"email"`
	Role        string     `gorm:"type:varchar(50);not null;default:'viewer'" json:"role"` // system role fallback
	StoreRoleID *uuid.UUID `gorm:"type:uuid;index" json:"store_role_id"`                   // custom role (optional)
	Token       string     `gorm:"type:varchar(64);not null;uniqueIndex" json:"token"`
	Status      string     `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	InvitedBy   string     `gorm:"type:varchar(255);not null" json:"invited_by"` // UserID of inviter
	ExpiresAt   time.Time  `gorm:"type:timestamptz;not null" json:"expires_at"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"type:timestamptz;autoUpdateTime" json:"updated_at"`
	DeletedAt   *time.Time `gorm:"type:timestamptz;index" json:"-"`
}

func (StoreInvitation) TableName() string {
	return "store_invitations"
}

// ── StoreWithRole ─────────────────────────────────────────────────────────────

// StoreWithRole includes the user's role and per-store profile for display purposes
type StoreWithRole struct {
	ID                uuid.UUID  `json:"id"`
	Name              string     `json:"name"`
	Slug              string     `json:"slug"`
	Logo              *string    `json:"logo"`
	Role              string     `json:"role"`
	TenantID          string     `json:"tenant_id"`
	Currency          string     `json:"currency"`
	ThemePrimaryColor string     `json:"theme_primary_color"`
	DisplayName       string     `json:"display_name"`
	StoreRoleName     string     `json:"store_role_name"`
	StoreRoleID       *uuid.UUID `json:"store_role_id"`
	OwnerName         string     `json:"owner_name"` // Better Auth user.name of the store owner
}
