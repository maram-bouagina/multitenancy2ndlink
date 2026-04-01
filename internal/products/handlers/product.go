package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/services"
)

type ProductHandler struct {
	svc            services.ProductService
	pricingSvc     services.PricingService
	publicationSvc services.PublicationValidationService
}

func NewProductHandler(
	svc services.ProductService,
	pricingSvc services.PricingService,
	publicationSvc services.PublicationValidationService,
) *ProductHandler {
	return &ProductHandler{
		svc:            svc,
		pricingSvc:     pricingSvc,
		publicationSvc: publicationSvc,
	}
}

// POST /api/stores/:storeId/products
// POST /api/stores/:storeId/products
func (h *ProductHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	tenantID, _ := c.Locals("tenantID").(string) // add this line

	var req dto.CreateProductRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Create(db, tenantID, storeID, req) // pass tenantID here
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores/:storeId/products
func (h *ProductHandler) GetAll(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	filter := dto.ProductFilter{
		CategoryID: strings.TrimSpace(c.Query("category_id")),
		Status:     strings.TrimSpace(c.Query("status")),
		Visibility: strings.TrimSpace(c.Query("visibility")),
		Brand:      strings.TrimSpace(c.Query("brand")),
		Search:     strings.TrimSpace(c.Query("search")),
		SortBy:     strings.TrimSpace(c.Query("sort_by", "newest")),
		Page:       1,
		Limit:      20,
	}

	if pageRaw := c.Query("page"); pageRaw != "" {
		if page, parseErr := strconv.Atoi(pageRaw); parseErr == nil && page > 0 {
			filter.Page = page
		}
	}
	if limitRaw := c.Query("limit"); limitRaw != "" {
		if limit, parseErr := strconv.Atoi(limitRaw); parseErr == nil && limit > 0 {
			filter.Limit = limit
		}
	}

	priceMinRaw := c.Query("price_min", c.Query("min_price"))
	if priceMinRaw != "" {
		if priceMin, parseErr := strconv.ParseFloat(priceMinRaw, 64); parseErr == nil {
			filter.PriceMin = &priceMin
		}
	}
	priceMaxRaw := c.Query("price_max", c.Query("max_price"))
	if priceMaxRaw != "" {
		if priceMax, parseErr := strconv.ParseFloat(priceMaxRaw, 64); parseErr == nil {
			filter.PriceMax = &priceMax
		}
	}

	inStockRaw := c.Query("in_stock", c.Query("inStock"))
	if inStockRaw != "" {
		if inStock, parseErr := strconv.ParseBool(inStockRaw); parseErr == nil {
			filter.InStock = &inStock
		}
	}

	resp, err := h.svc.GetAll(db, storeID, filter)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(resp)
}

// GET /api/stores/:storeId/products/:id
func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	resp, err := h.svc.GetByID(db, id, storeID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}

	return c.JSON(resp)
}

// PUT /api/stores/:storeId/products/:id
func (h *ProductHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateProductRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}

	// If status is being changed to published, validate first
	if req.Status != nil && *req.Status == "published" {
		// Get current product to validate
		current, err := h.svc.GetByID(db, id, storeID)
		if err != nil {
			return helpers.Fail(c, fiber.StatusNotFound, err)
		}

		// Validate the effective post-update state, not a partial shell model.
		visibility := current.Visibility
		if req.Visibility != nil {
			visibility = *req.Visibility
		}

		currency := current.Currency
		if req.Currency != nil {
			currency = *req.Currency
		}

		trackStock := current.TrackStock
		if req.TrackStock != nil {
			trackStock = *req.TrackStock
		}

		stock := current.Stock
		if req.Stock != nil {
			stock = *req.Stock
		}

		weight := current.Weight
		if req.Weight != nil {
			weight = req.Weight
		}

		salePrice := current.SalePrice
		if req.SalePrice != nil {
			salePrice = req.SalePrice
		}

		saleStart := current.SaleStart
		if req.SaleStart != nil {
			saleStart = req.SaleStart
		}

		saleEnd := current.SaleEnd
		if req.SaleEnd != nil {
			saleEnd = req.SaleEnd
		}

		product := &models.Product{
			Title:       current.Title,
			Description: current.Description,
			Price:       current.Price,
			Status:      models.ProductStatus(*req.Status),
			Visibility:  visibility,
			Currency:    currency,
			TrackStock:  trackStock,
			Stock:       stock,
			Weight:      weight,
			SalePrice:   salePrice,
			SaleStart:   saleStart,
			SaleEnd:     saleEnd,
		}

		if req.Title != nil {
			product.Title = *req.Title
		}
		if req.Description != nil {
			product.Description = req.Description
		}
		if req.Price != nil {
			product.Price = *req.Price
		}

		if err := h.publicationSvc.ValidateForPublication(product); err != nil {
			return helpers.Fail(c, fiber.StatusBadRequest, err)
		}
	}

	resp, err := h.svc.Update(db, id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.JSON(resp)
}

// DELETE /api/stores/:storeId/products/:id
func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(db, id, storeID); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// POST /api/stores/:storeId/products/:id/clone
func (h *ProductHandler) Clone(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.CloneProductRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	if req.SourceProductID != id {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "source_product_id does not match the product ID in URL"))
	}
	resp, err := h.svc.Clone(db, id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// POST /api/stores/:storeId/products/:id/stock/adjust
func (h *ProductHandler) AdjustStock(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.AdjustStockRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.AdjustStock(db, id, storeID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

// POST /api/stores/:storeId/products/:id/stock/reserve
func (h *ProductHandler) ReserveStock(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	userID, err := helpers.ParseUserID(c)
	if err != nil {
		return err
	}
	var req dto.StockReservationRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.ReserveStock(db, id, storeID, userID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}
