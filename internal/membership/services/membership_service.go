package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"multitenancypfe/internal/database"
	"multitenancypfe/internal/membership/dto"
	"multitenancypfe/internal/membership/models"
	"multitenancypfe/internal/membership/repo"
)

type MembershipService interface {
	// ── Roles ──────────────────────────────────────────────────────────────────
	CreateRole(storeID uuid.UUID, inviterID string, actorIsOwner bool, req dto.CreateRoleRequest) (*models.StoreRole, error)
	GetStoreRoles(storeID uuid.UUID) ([]dto.RoleResponse, error)
	UpdateRole(roleID uuid.UUID, actorID string, actorIsOwner bool, storeID uuid.UUID, req dto.UpdateRoleRequest) error
	DeleteRole(roleID uuid.UUID, actorID string, actorIsOwner bool, storeID uuid.UUID) error
	GetAllPermissions() []string

	// ── Invitations ────────────────────────────────────────────────────────────
	CreateInvitation(storeID uuid.UUID, tenantID, inviterID string, req dto.CreateInvitationRequest) (*models.StoreInvitation, error)
	AcceptInvitation(token, userID, userEmail, displayName, phone, bio string) (uuid.UUID, error)
	GetInvitationPreview(token string) (*dto.InvitationPreviewResponse, error)
	GetStoreInvitations(storeID uuid.UUID) ([]dto.InvitationResponse, error)
	RevokeInvitation(invitationID uuid.UUID) error

	// ── Members ────────────────────────────────────────────────────────────────
	GetStoreMembers(storeID uuid.UUID) ([]dto.MemberResponse, error)
	UpdateMemberRole(memberID uuid.UUID, storeID uuid.UUID, actorID string, req dto.UpdateMemberRoleRequest) error
	RemoveMember(memberID uuid.UUID) error

	// ── User Stores ────────────────────────────────────────────────────────────
	GetMyStores(userID string) (dto.MyStoresResponse, error)

	// ── Verification ───────────────────────────────────────────────────────────
	VerifyStoreAccess(storeID uuid.UUID, userID string) (*models.StoreMember, error)
}

type membershipService struct {
	repo         repo.MembershipRepository
	emailService EmailService
}

func NewMembershipService(repo repo.MembershipRepository) MembershipService {
	return &membershipService{
		repo:         repo,
		emailService: NewEmailService(),
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func roleToDTO(role *models.StoreRole, memberCount int64) dto.RoleResponse {
	perms := []string(role.Permissions)
	if perms == nil {
		perms = []string{}
	}
	return dto.RoleResponse{
		ID:          role.ID,
		StoreID:     role.StoreID,
		Name:        role.Name,
		Description: role.Description,
		Permissions: perms,
		IsSystem:    role.IsSystem,
		MemberCount: memberCount,
		CreatedAt:   role.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   role.UpdatedAt.Format(time.RFC3339),
	}
}

func memberToDTO(member *models.StoreMember) dto.MemberResponse {
	var storeRole *dto.RoleResponse
	if member.StoreRole != nil {
		r := roleToDTO(member.StoreRole, 0)
		storeRole = &r
	}

	// Compute the effective permission list for the frontend
	var perms []string
	if member.Role == "owner" {
		perms = models.AllPermissions
	} else if member.StoreRole != nil {
		perms = []string(member.StoreRole.Permissions)
	} else {
		perms = models.SystemRolePermissions[member.Role]
	}
	if perms == nil {
		perms = []string{}
	}

	return dto.MemberResponse{
		ID:          member.ID,
		UserID:      member.UserID,
		Role:        member.Role,
		StoreRoleID: member.StoreRoleID,
		StoreRole:   storeRole,
		Permissions: perms,
		DisplayName: member.DisplayName,
		Phone:       member.Phone,
		Bio:         member.Bio,
		CreatedAt:   member.CreatedAt.Format(time.RFC3339),
	}
}

// ── Roles ──────────────────────────────────────────────────────────────────────

func (s *membershipService) CreateRole(storeID uuid.UUID, actorID string, actorIsOwner bool, req dto.CreateRoleRequest) (*models.StoreRole, error) {
	// Verify actor is owner
	if !actorIsOwner {
		member, err := s.repo.GetMemberByStoreAndUser(storeID, actorID)
		if err != nil || member.Role != "owner" {
			return nil, errors.New("only owners can manage roles")
		}
	}

	// Validate permissions
	if err := validatePermissions(req.Permissions); err != nil {
		return nil, err
	}

	role := &models.StoreRole{
		StoreID:     storeID,
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		Permissions: models.StringArray(req.Permissions),
	}

	if err := s.repo.CreateRole(role); err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}
	return role, nil
}

func (s *membershipService) GetStoreRoles(storeID uuid.UUID) ([]dto.RoleResponse, error) {
	roles, err := s.repo.GetStoreRoles(storeID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.RoleResponse, 0, len(roles))
	for i := range roles {
		count, _ := s.repo.CountMembersWithRole(roles[i].ID)
		result = append(result, roleToDTO(&roles[i], count))
	}
	return result, nil
}

func (s *membershipService) UpdateRole(roleID uuid.UUID, actorID string, actorIsOwner bool, storeID uuid.UUID, req dto.UpdateRoleRequest) error {
	// Verify actor is owner
	if !actorIsOwner {
		member, err := s.repo.GetMemberByStoreAndUser(storeID, actorID)
		if err != nil || member.Role != "owner" {
			return errors.New("only owners can manage roles")
		}
	}

	role, err := s.repo.GetRoleByID(roleID)
	if err != nil {
		return errors.New("role not found")
	}
	if role.StoreID != storeID {
		return errors.New("role does not belong to this store")
	}
	if role.IsSystem {
		return errors.New("system roles cannot be modified")
	}

	if err := validatePermissions(req.Permissions); err != nil {
		return err
	}

	role.Name = strings.TrimSpace(req.Name)
	role.Description = strings.TrimSpace(req.Description)
	role.Permissions = models.StringArray(req.Permissions)
	return s.repo.UpdateRole(role)
}

func (s *membershipService) DeleteRole(roleID uuid.UUID, actorID string, actorIsOwner bool, storeID uuid.UUID) error {
	if !actorIsOwner {
		member, err := s.repo.GetMemberByStoreAndUser(storeID, actorID)
		if err != nil || member.Role != "owner" {
			return errors.New("only owners can manage roles")
		}
	}

	role, err := s.repo.GetRoleByID(roleID)
	if err != nil {
		return errors.New("role not found")
	}
	if role.StoreID != storeID {
		return errors.New("role does not belong to this store")
	}
	if role.IsSystem {
		return errors.New("system roles cannot be deleted")
	}

	// Check if any members currently use this role
	count, _ := s.repo.CountMembersWithRole(roleID)
	if count > 0 {
		return fmt.Errorf("cannot delete role: %d member(s) are currently assigned to it", count)
	}

	return s.repo.DeleteRole(roleID)
}

func (s *membershipService) GetAllPermissions() []string {
	return models.AllPermissions
}

// ── Invitations ────────────────────────────────────────────────────────────────

// ErrAlreadyMember is returned when the invited user is already a member of the store.
var ErrAlreadyMember = errors.New("this email is already a member of this store")

// ErrAlreadyInvited is returned when there is already a pending invitation for this email.
var ErrAlreadyInvited = errors.New("a pending invitation for this email already exists")

func (s *membershipService) CreateInvitation(
	storeID uuid.UUID,
	tenantID, inviterID string,
	req dto.CreateInvitationRequest,
) (*models.StoreInvitation, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if req.Role == "owner" {
		return nil, errors.New("cannot invite a user as owner")
	}

	// Check if the email already belongs to a member of this store
	var existingMemberUser database.BetterAuthUser
	if database.DB.Where("LOWER(email) = LOWER(?)", email).First(&existingMemberUser).Error == nil {
		if existing, _ := s.repo.GetMemberByStoreAndUser(storeID, existingMemberUser.ID); existing != nil {
			return nil, ErrAlreadyMember
		}
	}

	// Check if there is already a pending invitation for this email
	var pendingCount int64
	database.DB.Model(&models.StoreInvitation{}).
		Where("store_id = ? AND LOWER(email) = LOWER(?) AND status = 'pending' AND expires_at > NOW()", storeID, email).
		Count(&pendingCount)
	if pendingCount > 0 {
		return nil, ErrAlreadyInvited
	}

	// If a custom role is specified, verify it belongs to this store
	if req.StoreRoleID != nil {
		role, err := s.repo.GetRoleByID(*req.StoreRoleID)
		if err != nil || role.StoreID != storeID {
			return nil, errors.New("invalid custom role for this store")
		}
	}

	token, err := s.repo.GenerateInvitationToken()
	if err != nil {
		return nil, err
	}

	invitation := &models.StoreInvitation{
		StoreID:     storeID,
		Email:       email,
		Role:        req.Role,
		StoreRoleID: req.StoreRoleID,
		Token:       token,
		Status:      "pending",
		InvitedBy:   inviterID,
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour),
	}

	if err := s.repo.CreateInvitation(invitation); err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	// Send email asynchronously so the API response returns immediately.
	go func() {
		// Look up inviter name from Better Auth user table
		inviterName := "Store Owner"
		var inviter database.BetterAuthUser
		if err := database.DB.Where("id = ?", inviterID).First(&inviter).Error; err == nil {
			inviterName = inviter.Name
		}

		// Look up store name from the tenant schema
		storeName := "the store"
		ownerMember, err := s.repo.GetOwnerMember(storeID)
		if err == nil {
			var result struct{ Name string }
			schemaTable := fmt.Sprintf(`"tenant_%s".stores`, ownerMember.TenantID)
			database.DB.Raw("SELECT name FROM "+schemaTable+" WHERE id = ?", storeID).Scan(&result)
			if result.Name != "" {
				storeName = result.Name
			}
		}

		_ = s.emailService.SendInvitationEmail(email, inviterName, storeName, token)
	}()

	return invitation, nil
}

func (s *membershipService) AcceptInvitation(token, userID, userEmail, displayName, phone, bio string) (uuid.UUID, error) {
	invitation, err := s.repo.GetInvitationByToken(token)
	if err != nil {
		return uuid.Nil, errors.New("invitation not found or expired")
	}

	if !strings.EqualFold(strings.TrimSpace(invitation.Email), strings.TrimSpace(userEmail)) {
		return uuid.Nil, errors.New("invitation email does not match your account")
	}

	existing, _ := s.repo.GetMemberByStoreAndUser(invitation.StoreID, userID)
	if existing != nil {
		return uuid.Nil, errors.New("you are already a member of this store")
	}

	ownerMember, err := s.repo.GetOwnerMember(invitation.StoreID)
	if err != nil {
		return uuid.Nil, errors.New("could not determine store owner")
	}

	member := &models.StoreMember{
		StoreID:     invitation.StoreID,
		UserID:      userID,
		TenantID:    ownerMember.TenantID,
		Role:        invitation.Role,
		StoreRoleID: invitation.StoreRoleID,
		DisplayName: strings.TrimSpace(displayName),
		Phone:       strings.TrimSpace(phone),
		Bio:         strings.TrimSpace(bio),
	}

	if err := s.repo.CreateMember(member); err != nil {
		return uuid.Nil, fmt.Errorf("failed to create member: %w", err)
	}
	// Hard-delete so the invitation no longer appears in lists and same email can be re-invited later.
	if err := s.repo.DeleteInvitation(invitation.ID); err != nil {
		return uuid.Nil, fmt.Errorf("failed to delete invitation: %w", err)
	}
	return invitation.StoreID, nil
}

func (s *membershipService) GetInvitationPreview(token string) (*dto.InvitationPreviewResponse, error) {
	inv, err := s.repo.GetInvitationByTokenAny(token)
	if err != nil {
		return nil, errors.New("invitation not found")
	}

	// Inviter name from public user table
	inviterName := "A team member"
	var inviter database.BetterAuthUser
	if err := database.DB.Where("id = ?", inv.InvitedBy).First(&inviter).Error; err == nil {
		inviterName = inviter.Name
	}

	// Store name: query the owner's tenant schema directly.
	// The owner member gives us the TenantID (schema routing key).
	storeName := "a store"
	ownerMember, err := s.repo.GetOwnerMember(inv.StoreID)
	if err == nil {
		var result struct{ Name string }
		// TenantID is a Better Auth-generated ID — alphanumeric, safe to interpolate.
		schemaTable := fmt.Sprintf(`"tenant_%s".stores`, ownerMember.TenantID)
		database.DB.Raw("SELECT name FROM "+schemaTable+" WHERE id = ?", inv.StoreID).Scan(&result)
		if result.Name != "" {
			storeName = result.Name
		}
	}

	// Check if the invited email already has an account (case-insensitive)
	userExists := false
	var existingUser database.BetterAuthUser
	if database.DB.Where("LOWER(email) = LOWER(?)", inv.Email).First(&existingUser).Error == nil {
		userExists = true
	}

	// Resolve display name and description from custom role (if set), else system role
	roleName := strings.Title(inv.Role) // fallback: capitalise system role key
	roleDescription := ""
	if inv.StoreRoleID != nil {
		if customRole, err := s.repo.GetRoleByID(*inv.StoreRoleID); err == nil {
			roleName = customRole.Name
			roleDescription = customRole.Description
		}
	}

	return &dto.InvitationPreviewResponse{
		Email:           inv.Email,
		Role:            inv.Role,
		RoleName:        roleName,
		RoleDescription: roleDescription,
		StoreName:       storeName,
		InviterName:     inviterName,
		ExpiresAt:       inv.ExpiresAt.Format(time.RFC3339),
		Status:          inv.Status,
		UserExists:      userExists,
	}, nil
}

func (s *membershipService) GetStoreInvitations(storeID uuid.UUID) ([]dto.InvitationResponse, error) {
	invitations, err := s.repo.GetStoreInvitations(storeID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.InvitationResponse, 0, len(invitations))
	for _, inv := range invitations {
		item := dto.InvitationResponse{
			ID:          inv.ID,
			Email:       inv.Email,
			Role:        inv.Role,
			StoreRoleID: inv.StoreRoleID,
			Status:      inv.Status,
			ExpiresAt:   inv.ExpiresAt.Format(time.RFC3339),
			CreatedAt:   inv.CreatedAt.Format(time.RFC3339),
		}
		// Populate custom role details when present
		if inv.StoreRoleID != nil {
			if customRole, err := s.repo.GetRoleByID(*inv.StoreRoleID); err == nil {
				r := roleToDTO(customRole, 0)
				item.StoreRole = &r
			}
		}
		result = append(result, item)
	}
	return result, nil
}

func (s *membershipService) RevokeInvitation(invitationID uuid.UUID) error {
	// Hard-delete so the same email can be re-invited immediately.
	return s.repo.DeleteInvitation(invitationID)
}

// ── Members ────────────────────────────────────────────────────────────────────

func (s *membershipService) GetStoreMembers(storeID uuid.UUID) ([]dto.MemberResponse, error) {
	members, err := s.repo.GetStoreMembers(storeID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.MemberResponse, 0, len(members))
	for i := range members {
		result = append(result, memberToDTO(&members[i]))
	}
	return result, nil
}

func (s *membershipService) UpdateMemberRole(memberID uuid.UUID, storeID uuid.UUID, actorID string, req dto.UpdateMemberRoleRequest) error {
	// Verify actor is owner
	actor, err := s.repo.GetMemberByStoreAndUser(storeID, actorID)
	if err != nil || actor.Role != "owner" {
		return errors.New("only owners can manage member roles")
	}

	// Validate custom role belongs to this store (if provided)
	if req.StoreRoleID != nil {
		role, err := s.repo.GetRoleByID(*req.StoreRoleID)
		if err != nil || role.StoreID != storeID {
			return errors.New("invalid custom role for this store")
		}
	}

	return s.repo.UpdateMemberRole(memberID, req.Role, req.StoreRoleID)
}

func (s *membershipService) RemoveMember(memberID uuid.UUID) error {
	return s.repo.DeleteMember(memberID)
}

// ── User Stores ────────────────────────────────────────────────────────────────

func (s *membershipService) GetMyStores(userID string) (dto.MyStoresResponse, error) {
	stores, err := s.repo.GetUserStores(userID)
	if err != nil {
		return dto.MyStoresResponse{}, err
	}

	// Batch-load owner names by TenantID (= owner's Better Auth user ID)
	tenantIDs := make([]string, 0, len(stores))
	tenantSet := make(map[string]struct{})
	for _, s := range stores {
		if _, seen := tenantSet[s.TenantID]; !seen {
			tenantIDs = append(tenantIDs, s.TenantID)
			tenantSet[s.TenantID] = struct{}{}
		}
	}
	ownerNames := make(map[string]string)
	if len(tenantIDs) > 0 {
		var owners []database.BetterAuthUser
		database.DB.Where("id IN ?", tenantIDs).Find(&owners)
		for _, o := range owners {
			ownerNames[o.ID] = o.Name
		}
	}

	storesDTO := make([]dto.StoreWithRoleDTO, 0, len(stores))
	for _, store := range stores {
		// Compute effective permissions for this membership
		var permissions []string
		if store.Role == "owner" {
			permissions = models.AllPermissions
		} else if store.StoreRoleID != nil {
			if customRole, err := s.repo.GetRoleByID(*store.StoreRoleID); err == nil {
				permissions = []string(customRole.Permissions)
			}
		}
		if permissions == nil {
			permissions = models.SystemRolePermissions[store.Role]
		}
		if permissions == nil {
			permissions = []string{}
		}

		storesDTO = append(storesDTO, dto.StoreWithRoleDTO{
			ID:                store.ID,
			Name:              store.Name,
			Slug:              store.Slug,
			Logo:              store.Logo,
			Role:              store.Role,
			Currency:          store.Currency,
			ThemePrimaryColor: store.ThemePrimaryColor,
			DisplayName:       store.DisplayName,
			StoreRoleName:     store.StoreRoleName,
			OwnerName:         ownerNames[store.TenantID],
			Permissions:       permissions,
		})
	}
	return dto.MyStoresResponse{Stores: storesDTO}, nil
}

// ── Verification ───────────────────────────────────────────────────────────────

func (s *membershipService) VerifyStoreAccess(storeID uuid.UUID, userID string) (*models.StoreMember, error) {
	member, err := s.repo.GetMemberByStoreAndUser(storeID, userID)
	if err != nil {
		return nil, errors.New("you don't have access to this store")
	}
	return member, nil
}

// ── Internal helpers ───────────────────────────────────────────────────────────

func validatePermissions(perms []string) error {
	allowed := make(map[string]struct{}, len(models.AllPermissions))
	for _, p := range models.AllPermissions {
		allowed[p] = struct{}{}
	}
	for _, p := range perms {
		if _, ok := allowed[p]; !ok {
			return fmt.Errorf("unknown permission: %q", p)
		}
	}
	return nil
}
