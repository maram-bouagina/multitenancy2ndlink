package handlers

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"mime/multipart"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"multitenancypfe/internal/helpers"
	"multitenancypfe/internal/media"
	"multitenancypfe/internal/middleware"
	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/repo"
	"multitenancypfe/internal/products/services"
)

type ImageHandler struct {
	validationSvc  services.ImageValidationService
	pricingSvc     services.PricingService
	publicationSvc services.PublicationValidationService
	storage        media.Storage
	maxFileSizeMB  int64
}

func NewImageHandler(
	validationSvc services.ImageValidationService,
	pricingSvc services.PricingService,
	publicationSvc services.PublicationValidationService,
	storage media.Storage,
	maxFileSizeMB int64,
) *ImageHandler {
	return &ImageHandler{
		validationSvc:  validationSvc,
		pricingSvc:     pricingSvc,
		publicationSvc: publicationSvc,
		storage:        storage,
		maxFileSizeMB:  maxFileSizeMB,
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

	if fileHeader.Size <= 0 {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "empty file"))
	}

	if fileHeader.Size > h.maxFileSizeMB*1024*1024 {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, fmt.Sprintf("file exceeds maximum size of %dMB", h.maxFileSizeMB)))
	}

	fileType := detectFileType(fileHeader)
	if !isAllowedImageType(fileType) {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "unsupported image format. Allowed: PNG, JPG, WEBP"))
	}

	originalBytes, err := readMultipartFile(fileHeader)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	img, _, err := image.Decode(bytes.NewReader(originalBytes))
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, fiber.NewError(fiber.StatusBadRequest, "unable to decode image"))
	}

	imageID := uuid.New()
	baseKey := fmt.Sprintf("stores/%s/products/%s/%s", storeID.String(), productID.String(), imageID.String())
	originalKey := fmt.Sprintf("%s/original%s", baseKey, fileExtension(fileType, fileHeader.Filename))
	thumbnailKey := fmt.Sprintf("%s/thumbnail.jpg", baseKey)
	mediumKey := fmt.Sprintf("%s/medium.jpg", baseKey)
	largeKey := fmt.Sprintf("%s/large.jpg", baseKey)

	thumbnailBytes, err := encodeResizedJPEG(img, 320, 78)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	mediumBytes, err := encodeResizedJPEG(img, 768, 80)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	largeBytes, err := encodeResizedJPEG(img, 1400, 82)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	if err := h.storage.Upload(c.Context(), originalKey, originalBytes, fileType); err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	if err := h.storage.Upload(c.Context(), thumbnailKey, thumbnailBytes, "image/jpeg"); err != nil {
		_ = h.storage.Delete(c.Context(), originalKey)
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	if err := h.storage.Upload(c.Context(), mediumKey, mediumBytes, "image/jpeg"); err != nil {
		_ = h.storage.Delete(c.Context(), originalKey)
		_ = h.storage.Delete(c.Context(), thumbnailKey)
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	if err := h.storage.Upload(c.Context(), largeKey, largeBytes, "image/jpeg"); err != nil {
		_ = h.storage.Delete(c.Context(), originalKey)
		_ = h.storage.Delete(c.Context(), thumbnailKey)
		_ = h.storage.Delete(c.Context(), mediumKey)
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	position := 0
	if rawPosition := strings.TrimSpace(c.FormValue("position")); rawPosition != "" {
		if parsedPosition, parseErr := strconv.Atoi(rawPosition); parseErr == nil && parsedPosition >= 0 {
			position = parsedPosition
		}
	}

	svc := h.getTenantImageService(c)
	if position == 0 {
		if existing, getErr := svc.GetByProductID(storeID, productID); getErr == nil {
			position = len(*existing)
		}
	}

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

	req := dto.CreateProductImageRequest{
		URL:          "/media/" + originalKey,
		URLThumbnail: "/media/" + thumbnailKey,
		URLMedium:    "/media/" + mediumKey,
		URLLarge:     "/media/" + largeKey,
		AltText:      altTextPtr,
		Caption:      captionPtr,
		Position:     position,
		FileSize:     fileHeader.Size,
		FileType:     fileType,
	}

	// Validate image before creating
	if err := h.validationSvc.ValidateCreateImageRequest(req, h.maxFileSizeMB); err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}

	resp, err := svc.Create(storeID, productID, req)
	if err != nil {
		_ = h.storage.Delete(c.Context(), originalKey)
		_ = h.storage.Delete(c.Context(), thumbnailKey)
		_ = h.storage.Delete(c.Context(), mediumKey)
		_ = h.storage.Delete(c.Context(), largeKey)
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

func detectFileType(fileHeader *multipart.FileHeader) string {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		return ""
	}
}

func isAllowedImageType(fileType string) bool {
	return fileType == "image/jpeg" || fileType == "image/png" || fileType == "image/webp"
}

func fileExtension(fileType string, filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" {
		return ext
	}

	switch fileType {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}

func resizeImage(img image.Image, maxWidth int) image.Image {
	bounds := img.Bounds()
	currentWidth := bounds.Dx()
	currentHeight := bounds.Dy()
	if currentWidth <= maxWidth {
		return img
	}

	ratio := float64(maxWidth) / float64(currentWidth)
	targetHeight := int(float64(currentHeight) * ratio)
	if targetHeight < 1 {
		targetHeight = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, maxWidth, targetHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
	return dst
}

func encodeResizedJPEG(img image.Image, width int, quality int) ([]byte, error) {
	resized := resizeImage(img, width)
	buf := bytes.NewBuffer(nil)
	if err := jpeg.Encode(buf, resized, &jpeg.Options{Quality: quality}); err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "cannot encode image variant")
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
