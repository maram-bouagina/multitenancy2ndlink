package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	"multitenancypfe/internal/customers/repo"
	"multitenancypfe/internal/middleware"
)

type CustomerGroupHandler struct {
	groupRepo    *repo.CustomerGroupRepo
	customerRepo *repo.CustomerRepo
}

func NewCustomerGroupHandler(gr *repo.CustomerGroupRepo, cr *repo.CustomerRepo) *CustomerGroupHandler {
	return &CustomerGroupHandler{groupRepo: gr, customerRepo: cr}
}

// GET /api/stores/:storeId/customer-groups
func (h *CustomerGroupHandler) List(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}

	db := middleware.GetTenantDB(c)
	groups, err := h.groupRepo.List(db, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "query failed"})
	}

	items := make([]dto.CustomerGroupResponse, len(groups))
	for i, g := range groups {
		count, _ := h.groupRepo.MemberCount(db, g.ID)
		items[i] = dto.CustomerGroupResponse{
			ID:          g.ID,
			Name:        g.Name,
			Description: g.Description,
			Discount:    g.Discount,
			MemberCount: count,
			CreatedAt:   g.CreatedAt.Format(time.RFC3339),
		}
	}

	return c.JSON(items)
}

// GET /api/stores/:storeId/customer-groups/:id
func (h *CustomerGroupHandler) GetByID(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid group id"})
	}

	db := middleware.GetTenantDB(c)
	group, err := h.groupRepo.FindByID(db, groupID)
	if err != nil || group == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	count, _ := h.groupRepo.MemberCount(db, groupID)
	members, _ := h.groupRepo.ListMembers(db, groupID)

	memberResponses := make([]dto.CustomerResponse, len(members))
	for i, m := range members {
		memberResponses[i] = toCustomerResponse(&m)
	}

	return c.JSON(fiber.Map{
		"group": dto.CustomerGroupResponse{
			ID:          group.ID,
			Name:        group.Name,
			Description: group.Description,
			Discount:    group.Discount,
			MemberCount: count,
			CreatedAt:   group.CreatedAt.Format(time.RFC3339),
		},
		"members": memberResponses,
	})
}

// POST /api/stores/:storeId/customer-groups
func (h *CustomerGroupHandler) Create(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}

	var req dto.CreateCustomerGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := middleware.GetTenantDB(c)
	group := &models.CustomerGroup{
		StoreID:     storeID,
		Name:        req.Name,
		Description: req.Description,
		Discount:    req.Discount,
	}

	if err := h.groupRepo.Create(db, group); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "creation failed"})
	}

	return c.Status(fiber.StatusCreated).JSON(dto.CustomerGroupResponse{
		ID:          group.ID,
		Name:        group.Name,
		Description: group.Description,
		Discount:    group.Discount,
		MemberCount: 0,
		CreatedAt:   group.CreatedAt.Format(time.RFC3339),
	})
}

// PUT /api/stores/:storeId/customer-groups/:id
func (h *CustomerGroupHandler) Update(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid group id"})
	}

	var req dto.UpdateCustomerGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if err := validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	}

	db := middleware.GetTenantDB(c)
	group, err := h.groupRepo.FindByID(db, groupID)
	if err != nil || group == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "group not found"})
	}

	group.Name = req.Name
	group.Description = req.Description
	group.Discount = req.Discount

	if err := h.groupRepo.Update(db, group); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	count, _ := h.groupRepo.MemberCount(db, groupID)
	return c.JSON(dto.CustomerGroupResponse{
		ID:          group.ID,
		Name:        group.Name,
		Description: group.Description,
		Discount:    group.Discount,
		MemberCount: count,
		CreatedAt:   group.CreatedAt.Format(time.RFC3339),
	})
}

// DELETE /api/stores/:storeId/customer-groups/:id
func (h *CustomerGroupHandler) Delete(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid group id"})
	}

	db := middleware.GetTenantDB(c)
	if err := h.groupRepo.Delete(db, groupID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "deletion failed"})
	}

	return c.JSON(fiber.Map{"message": "Group deleted"})
}

// POST /api/stores/:storeId/customer-groups/:id/members
func (h *CustomerGroupHandler) AddMembers(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid group id"})
	}

	var req dto.AddGroupMembersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := middleware.GetTenantDB(c)
	if err := h.groupRepo.AddMembers(db, groupID, req.CustomerIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add members"})
	}

	return c.JSON(fiber.Map{"message": "Members added"})
}

// DELETE /api/stores/:storeId/customer-groups/:id/members
func (h *CustomerGroupHandler) RemoveMembers(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid group id"})
	}

	var req dto.RemoveGroupMembersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := middleware.GetTenantDB(c)
	if err := h.groupRepo.RemoveMembers(db, groupID, req.CustomerIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove members"})
	}

	return c.JSON(fiber.Map{"message": "Members removed"})
}
