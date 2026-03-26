package handlers

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/customers/dto"
	"multitenancypfe/internal/customers/models"
	"multitenancypfe/internal/customers/repo"
	"multitenancypfe/internal/middleware"
)

// AdminCustomerHandler handles merchant-side customer management.
type AdminCustomerHandler struct {
	repo *repo.CustomerRepo
}

func NewAdminCustomerHandler(r *repo.CustomerRepo) *AdminCustomerHandler {
	return &AdminCustomerHandler{repo: r}
}

func (h *AdminCustomerHandler) tenantDB(c *fiber.Ctx) *fiber.Ctx {
	return c
}

// GET /api/stores/:storeId/customers
func (h *AdminCustomerHandler) List(c *fiber.Ctx) error {
	storeID, err := uuid.Parse(c.Params("storeId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid store id"})
	}

	db := middleware.GetTenantDB(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search")
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := db.Model(&models.Customer{}).Where("store_id = ?", storeID)

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("(email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?)", like, like, like)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "count failed"})
	}

	var customers []models.Customer
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&customers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "query failed"})
	}

	items := make([]dto.CustomerResponse, len(customers))
	for i, cust := range customers {
		items[i] = toCustomerResponse(&cust)
	}

	return c.JSON(fiber.Map{
		"data":        items,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// GET /api/stores/:storeId/customers/:id
func (h *AdminCustomerHandler) GetByID(c *fiber.Ctx) error {
	customerID := c.Params("id")
	if customerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	db := middleware.GetTenantDB(c)
	customer, err := h.repo.FindByID(db, customerID)
	if err != nil || customer == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}

	// Include addresses
	addrs, _ := h.repo.ListAddresses(db, customerID)

	return c.JSON(fiber.Map{
		"customer":  toCustomerResponse(customer),
		"addresses": addrs,
	})
}

// PUT /api/stores/:storeId/customers/:id
func (h *AdminCustomerHandler) Update(c *fiber.Ctx) error {
	customerID := c.Params("id")
	if customerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	var req dto.AdminUpdateCustomerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	db := middleware.GetTenantDB(c)
	customer, err := h.repo.FindByID(db, customerID)
	if err != nil || customer == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}

	if req.Status != nil {
		customer.Status = *req.Status
	}
	if req.FirstName != nil {
		customer.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		customer.LastName = *req.LastName
	}
	if req.Phone != nil {
		customer.Phone = req.Phone
	}

	if err := h.repo.Update(db, customer); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	return c.JSON(toCustomerResponse(customer))
}

// DELETE /api/stores/:storeId/customers/:id
func (h *AdminCustomerHandler) Delete(c *fiber.Ctx) error {
	customerID := c.Params("id")
	if customerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customer id"})
	}

	db := middleware.GetTenantDB(c)
	if err := h.repo.Delete(db, customerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "deletion failed"})
	}

	return c.JSON(fiber.Map{"message": "Customer deleted"})
}
