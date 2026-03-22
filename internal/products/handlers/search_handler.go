package handlers

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
	"multitenancypfe/internal/products/services"
)

type SearchHandler struct {
	svc services.ProductSearchService
}

func NewSearchHandler(svc services.ProductSearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// GET /api/stores/:storeId/products/search
func (h *SearchHandler) Search(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	db := helpers.GetTenantDB(c)

	// Parse query parameters into filter
	query := c.Query("q", "")
	filter := dto.ProductSearchFilter{
		Search: &query,
	}

	// Pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	filter.Page = page
	filter.Limit = limit

	// Status filter
	if statusStr := c.Query("status", ""); statusStr != "" {
		if statusStr == "draft" {
			status := models.StatusDraft
			filter.Status = &status
		} else if statusStr == "published" {
			status := models.StatusPublished
			filter.Status = &status
		} else if statusStr == "archived" {
			status := models.StatusArchived
			filter.Status = &status
		}
	}

	// Visibility filter
	if visibilityStr := c.Query("visibility", ""); visibilityStr != "" {
		if visibilityStr == "public" {
			visibility := models.VisibilityPublic
			filter.Visibility = &visibility
		} else if visibilityStr == "private" {
			visibility := models.VisibilityPrivate
			filter.Visibility = &visibility
		}
	}

	// Price range
	if minPrice := c.Query("price_min", ""); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filter.PriceMin = &price
		}
	}
	if maxPrice := c.Query("price_max", ""); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filter.PriceMax = &price
		}
	}

	// Stock filter
	if stock := c.Query("inStock", ""); stock != "" {
		if b, err := strconv.ParseBool(stock); err == nil {
			filter.InStock = &b
		}
	}

	// Category filter - skip for now as it needs uuid parsing
	// Tag filter - skip for now
	// Sorting
	if sortBy := c.Query("sort_by", ""); sortBy != "" {
		filter.SortBy = &sortBy
	}

	// Execute search
	results, err := h.svc.Search(db, storeID, filter)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, fmt.Errorf("search failed: %w", err))
	}

	return c.JSON(results)
}
