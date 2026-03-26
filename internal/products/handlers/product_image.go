package handlers

import (
	"bytes"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/media"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

type ImageHandler struct {
	uploadSvc services.ProductImageUploadService
	storage   media.Storage
}

func NewImageHandler(
	uploadSvc services.ProductImageUploadService,
	storage media.Storage,
) *ImageHandler {
	return &ImageHandler{
		uploadSvc: uploadSvc,
		storage:   storage,
	}
}

// getTenantImageService creates a service with the tenant-scoped database
func (h *ImageHandler) getTenantImageService(c *fiber.Ctx) services.ProductImageService {
	tenantDB := middleware.GetTenantDB(c)
	return services.NewProductImageService(repo.NewProductImageRepository(tenantDB))
}

// POST /api/stores/:storeId/products/:productId/images
func (h *ImageHandler) Create(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "file is required"))
	}

	originalBytes, err := readMultipartFile(fileHeader)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	var position *int
	if rawPosition := strings.TrimSpace(c.FormValue("position")); rawPosition != "" {
		if parsedPosition, parseErr := strconv.Atoi(rawPosition); parseErr == nil && parsedPosition >= 0 {
			position = &parsedPosition
		}
	}

	svc := h.getTenantImageService(c)

	altText := strings.TrimSpace(c.FormValue("alt_text"))
	caption := strings.TrimSpace(c.FormValue("caption"))

	var altTextPtr *string
	if altText != "" {
		altTextPtr = &altText
	}
	var captionPtr *string
	if caption != "" {
		captionPtr = &caption
	}

	resp, err := h.uploadSvc.CreateFromBytes(c.Context(), svc, storeID, productID, services.ProductImageUploadInput{
		Filename:    fileHeader.Filename,
		ContentType: fileHeader.Header.Get("Content-Type"),
		Data:        originalBytes,
		AltText:     altTextPtr,
		Caption:     captionPtr,
		Position:    position,
	})
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /api/stores/:storeId/products/:productId/images
func (h *ImageHandler) GetByProductID(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	svc := h.getTenantImageService(c)
	resp, err := svc.GetByProductID(storeID, productID)
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}

	return c.JSON(resp)
}

// PUT /api/stores/:storeId/products/:productId/images/:imageId
func (h *ImageHandler) Update(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	imageID, err := uuid.Parse(c.Params("imageId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	var req dto.UpdateProductImageRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}

	svc := h.getTenantImageService(c)
	resp, err := svc.Update(storeID, productID, imageID, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.JSON(resp)
}

// DELETE /api/stores/:storeId/products/:productId/images/:imageId
func (h *ImageHandler) Delete(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	imageID, err := uuid.Parse(c.Params("imageId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	svc := h.getTenantImageService(c)
	images, _ := svc.GetByProductID(storeID, productID)
	urlsToDelete := make([]string, 0, 4)
	if images != nil {
		for _, img := range *images {
			if img.ID == imageID {
				urlsToDelete = append(urlsToDelete, img.URL, img.URLThumbnail, img.URLMedium, img.URLLarge)
				break
			}
		}
	}

	if err := svc.Delete(storeID, productID, imageID); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}

	for _, imageURL := range urlsToDelete {
		if key, ok := mediaURLToKey(imageURL); ok {
			_ = h.storage.Delete(c.Context(), key)
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// POST /api/stores/:storeId/products/:productId/images/reorder
func (h *ImageHandler) Reorder(c *fiber.Ctx) error {
	storeID, err := parseStoreID(c)
	if err != nil {
		return err
	}
	productID, err := uuid.Parse(c.Params("productId"))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	var req dto.ReorderImagesRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}

	// Convert images to position map
	imagePositions := make(map[uuid.UUID]int)
	for _, img := range req.Images {
		imagePositions[img.ID] = img.Position
	}

	svc := h.getTenantImageService(c)
	if err := svc.Reorder(storeID, productID, imagePositions); err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func readMultipartFile(fileHeader *multipart.FileHeader) ([]byte, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "cannot open uploaded file")
	}
	defer file.Close()

	buf := bytes.NewBuffer(nil)
	if _, err := buf.ReadFrom(file); err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "cannot read uploaded file")
	}
	return buf.Bytes(), nil
}

func mediaURLToKey(imageURL string) (string, bool) {
	trimmed := strings.TrimSpace(imageURL)
	if !strings.HasPrefix(trimmed, "/media/") {
		return "", false
	}
	key := strings.TrimPrefix(trimmed, "/media/")
	if strings.TrimSpace(key) == "" {
		return "", false
	}
	return key, true
}
