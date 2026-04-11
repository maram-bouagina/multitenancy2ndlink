package repo

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"multitenancypfe/internal/database"
	"multitenancypfe/internal/membership/models"
)

type MembershipRepository interface {
	// ── Store Roles ───────────────────────────────────────────────────────────
	CreateRole(role *models.StoreRole) error
	GetRoleByID(roleID uuid.UUID) (*models.StoreRole, error)
	GetStoreRoles(storeID uuid.UUID) ([]models.StoreRole, error)
	UpdateRole(role *models.StoreRole) error
	DeleteRole(roleID uuid.UUID) error
	CountMembersWithRole(roleID uuid.UUID) (int64, error)

	// ── Store Members ─────────────────────────────────────────────────────────
	CreateMember(member *models.StoreMember) error
	GetMemberByStoreAndUser(storeID uuid.UUID, userID string) (*models.StoreMember, error)
	GetOwnerMember(storeID uuid.UUID) (*models.StoreMember, error)
	GetStoreMembers(storeID uuid.UUID) ([]models.StoreMember, error)
	UpdateMemberRole(memberID uuid.UUID, role string, storeRoleID *uuid.UUID) error
	DeleteMember(memberID uuid.UUID) error
	GetUserStores(userID string) ([]models.StoreWithRole, error)

	// ── Store Invitations ─────────────────────────────────────────────────────
	CreateInvitation(invitation *models.StoreInvitation) error
	GetInvitationByToken(token string) (*models.StoreInvitation, error)
	GetInvitationByTokenAny(token string) (*models.StoreInvitation, error)
	GetStoreInvitations(storeID uuid.UUID) ([]models.StoreInvitation, error)
	UpdateInvitationStatus(invitationID uuid.UUID, status string) error
	DeleteInvitation(invitationID uuid.UUID) error

	// ── Utilities ─────────────────────────────────────────────────────────────
	GenerateInvitationToken() (string, error)
}

type membershipRepository struct {
	db *gorm.DB
}

func NewMembershipRepository() MembershipRepository {
	return &membershipRepository{db: database.DB}
}

// ── Store Roles ───────────────────────────────────────────────────────────────

func (r *membershipRepository) CreateRole(role *models.StoreRole) error {
	return r.db.Create(role).Error
}

func (r *membershipRepository) GetRoleByID(roleID uuid.UUID) (*models.StoreRole, error) {
	var role models.StoreRole
	err := r.db.Where("id = ? AND deleted_at IS NULL", roleID).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *membershipRepository) GetStoreRoles(storeID uuid.UUID) ([]models.StoreRole, error) {
	var roles []models.StoreRole
	err := r.db.Where("store_id = ? AND deleted_at IS NULL", storeID).
		Order("created_at ASC").
		Find(&roles).Error
	return roles, err
}

func (r *membershipRepository) UpdateRole(role *models.StoreRole) error {
	return r.db.Save(role).Error
}

func (r *membershipRepository) DeleteRole(roleID uuid.UUID) error {
	return r.db.Delete(&models.StoreRole{}, "id = ?", roleID).Error
}

func (r *membershipRepository) CountMembersWithRole(roleID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.StoreMember{}).
		Where("store_role_id = ? AND deleted_at IS NULL", roleID).
		Count(&count).Error
	return count, err
}

// ── Store Members ─────────────────────────────────────────────────────────────

func (r *membershipRepository) CreateMember(member *models.StoreMember) error {
	return r.db.Create(member).Error
}

func (r *membershipRepository) GetMemberByStoreAndUser(storeID uuid.UUID, userID string) (*models.StoreMember, error) {
	var member models.StoreMember
	err := r.db.Preload("StoreRole").
		Where("store_id = ? AND user_id = ? AND deleted_at IS NULL", storeID, userID).
		First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

func (r *membershipRepository) GetOwnerMember(storeID uuid.UUID) (*models.StoreMember, error) {
	var member models.StoreMember
	err := r.db.Where("store_id = ? AND role = 'owner' AND deleted_at IS NULL", storeID).First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

func (r *membershipRepository) GetStoreMembers(storeID uuid.UUID) ([]models.StoreMember, error) {
	var members []models.StoreMember
	err := r.db.Preload("StoreRole").
		Where("store_id = ? AND deleted_at IS NULL", storeID).
		Order("created_at ASC").
		Find(&members).Error
	return members, err
}

func (r *membershipRepository) UpdateMemberRole(memberID uuid.UUID, role string, storeRoleID *uuid.UUID) error {
	updates := map[string]interface{}{
		"role":          role,
		"store_role_id": storeRoleID,
	}
	return r.db.Model(&models.StoreMember{}).
		Where("id = ?", memberID).
		Updates(updates).Error
}

func (r *membershipRepository) DeleteMember(memberID uuid.UUID) error {
	return r.db.Delete(&models.StoreMember{}, "id = ?", memberID).Error
}

func (r *membershipRepository) GetUserStores(userID string) ([]models.StoreWithRole, error) {
	var stores []models.StoreWithRole

	// Join store_members with the stores table across ALL tenant schemas
	// We need to query each tenant schema the user is a member of
	query := `
		SELECT DISTINCT
			s.id,
			s.name,
			s.slug,
			s.logo,
			sm.role,
			sm.tenant_id,
			sm.store_role_id,
			s.currency,
			s.theme_primary_color,
			sm.display_name,
			COALESCE(sr.name, '') AS store_role_name
		FROM public.store_members sm
		LEFT JOIN public.store_roles sr ON sr.id = sm.store_role_id AND sr.deleted_at IS NULL
		JOIN LATERAL (
			SELECT id, name, slug, logo, currency, theme_primary_color
			FROM IDENTIFIER(quote_ident('tenant_' || sm.tenant_id) || '.stores')
			WHERE id = sm.store_id
			LIMIT 1
		) s ON true
		WHERE sm.user_id = ?
		AND sm.deleted_at IS NULL
		ORDER BY s.name
	`

	err := r.db.Raw(query, userID).Scan(&stores).Error
	if err != nil {
		// Fallback: query each tenant schema individually
		// This is slower but more reliable
		return r.getUserStoresFallback(userID)
	}

	return stores, nil
}

// Fallback method that queries each tenant schema individually
func (r *membershipRepository) getUserStoresFallback(userID string) ([]models.StoreWithRole, error) {
	var memberships []models.StoreMember
	err := r.db.Where("user_id = ? AND deleted_at IS NULL", userID).Find(&memberships).Error
	if err != nil {
		return nil, err
	}

	var stores []models.StoreWithRole
	for _, member := range memberships {
		schema := fmt.Sprintf(`"tenant_%s"`, member.TenantID)
		query := fmt.Sprintf(`
			SELECT 
				id, name, slug, logo, currency, theme_primary_color
			FROM %s.stores
			WHERE id = ?
			LIMIT 1
		`, schema)

		var storeData struct {
			ID                uuid.UUID
			Name              string
			Slug              string
			Logo              *string
			Currency          string
			ThemePrimaryColor string
		}

		err := r.db.Raw(query, member.StoreID).Scan(&storeData).Error
		if err == nil {
			// Look up custom role name if set
			storeRoleName := ""
			if member.StoreRoleID != nil {
				var role models.StoreRole
				if r.db.Where("id = ? AND deleted_at IS NULL", member.StoreRoleID).First(&role).Error == nil {
					storeRoleName = role.Name
				}
			}
			stores = append(stores, models.StoreWithRole{
				ID:                storeData.ID,
				Name:              storeData.Name,
				Slug:              storeData.Slug,
				Logo:              storeData.Logo,
				Role:              member.Role,
				TenantID:          member.TenantID,
				Currency:          storeData.Currency,
				ThemePrimaryColor: storeData.ThemePrimaryColor,
				DisplayName:       member.DisplayName,
				StoreRoleName:     storeRoleName,
				StoreRoleID:       member.StoreRoleID,
			})
		}
	}

	return stores, nil
}

// ── Store Invitations ─────────────────────────────────────────────────────────

func (r *membershipRepository) CreateInvitation(invitation *models.StoreInvitation) error {
	return r.db.Create(invitation).Error
}

func (r *membershipRepository) GetInvitationByToken(token string) (*models.StoreInvitation, error) {
	var invitation models.StoreInvitation
	err := r.db.Where("token = ? AND status = 'pending' AND expires_at > ?", token, time.Now()).
		First(&invitation).Error
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

// GetInvitationByTokenAny returns an invitation by token regardless of status or expiry.
// Used for preview only — acceptance still requires the strict check above.
func (r *membershipRepository) GetInvitationByTokenAny(token string) (*models.StoreInvitation, error) {
	var invitation models.StoreInvitation
	if err := r.db.Where("token = ?", token).First(&invitation).Error; err != nil {
		return nil, err
	}
	return &invitation, nil
}

func (r *membershipRepository) GetStoreInvitations(storeID uuid.UUID) ([]models.StoreInvitation, error) {
	var invitations []models.StoreInvitation
	err := r.db.Where("store_id = ?", storeID).
		Order("created_at DESC").
		Find(&invitations).Error
	return invitations, err
}

func (r *membershipRepository) UpdateInvitationStatus(invitationID uuid.UUID, status string) error {
	return r.db.Model(&models.StoreInvitation{}).
		Where("id = ?", invitationID).
		Update("status", status).Error
}

func (r *membershipRepository) DeleteInvitation(invitationID uuid.UUID) error {
	return r.db.Delete(&models.StoreInvitation{}, "id = ?", invitationID).Error
}

// ── Utilities ─────────────────────────────────────────────────────────────────

func (r *membershipRepository) GenerateInvitationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", errors.New("token generation failed")
	}
	return hex.EncodeToString(bytes), nil
}
