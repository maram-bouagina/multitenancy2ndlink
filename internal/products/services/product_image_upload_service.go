package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"multitenancypfe/internal/media"
	"multitenancypfe/internal/products/dto"
)

type ProductImageUploadInput struct {
	Filename    string
	ContentType string
	Data        []byte
	AltText     *string
	Caption     *string
	Position    *int
}

type ProductImageUploadService interface {
	CreateFromBytes(ctx context.Context, svc ProductImageService, storeID uuid.UUID, productID uuid.UUID, input ProductImageUploadInput) (*dto.ProductImageResponse, error)
}

type productImageUploadService struct {
	validationSvc ImageValidationService
	storage       media.Storage
	maxFileSizeMB int64
}

func NewProductImageUploadService(validationSvc ImageValidationService, storage media.Storage, maxFileSizeMB int64) ProductImageUploadService {
	return &productImageUploadService{
		validationSvc: validationSvc,
		storage:       storage,
		maxFileSizeMB: maxFileSizeMB,
	}
}

func (s *productImageUploadService) CreateFromBytes(ctx context.Context, svc ProductImageService, storeID uuid.UUID, productID uuid.UUID, input ProductImageUploadInput) (*dto.ProductImageResponse, error) {
	if len(input.Data) == 0 {
		return nil, fmt.Errorf("empty file")
	}

	maxBytes := s.maxFileSizeMB * 1024 * 1024
	if int64(len(input.Data)) > maxBytes {
		return nil, fmt.Errorf("file exceeds maximum size of %dMB", s.maxFileSizeMB)
	}

	fileType := normalizeImageContentType(input.ContentType, input.Data, input.Filename)
	if !isAllowedImageType(fileType) {
		return nil, fmt.Errorf("unsupported image format. Allowed: PNG, JPG, WEBP")
	}

	img, _, err := image.Decode(bytes.NewReader(input.Data))
	if err != nil {
		return nil, fmt.Errorf("unable to decode image")
	}

	imageID := uuid.New()
	baseKey := fmt.Sprintf("stores/%s/products/%s/%s", storeID.String(), productID.String(), imageID.String())
	originalKey := fmt.Sprintf("%s/original%s", baseKey, fileExtension(fileType, input.Filename))
	thumbnailKey := fmt.Sprintf("%s/thumbnail.jpg", baseKey)
	mediumKey := fmt.Sprintf("%s/medium.jpg", baseKey)
	largeKey := fmt.Sprintf("%s/large.jpg", baseKey)

	thumbnailBytes, err := encodeResizedJPEG(img, 320, 78)
	if err != nil {
		return nil, err
	}
	mediumBytes, err := encodeResizedJPEG(img, 768, 80)
	if err != nil {
		return nil, err
	}
	largeBytes, err := encodeResizedJPEG(img, 1400, 82)
	if err != nil {
		return nil, err
	}

	if err := s.storage.Upload(ctx, originalKey, input.Data, fileType); err != nil {
		return nil, err
	}
	if err := s.storage.Upload(ctx, thumbnailKey, thumbnailBytes, "image/jpeg"); err != nil {
		_ = s.storage.Delete(ctx, originalKey)
		return nil, err
	}
	if err := s.storage.Upload(ctx, mediumKey, mediumBytes, "image/jpeg"); err != nil {
		_ = s.storage.Delete(ctx, originalKey)
		_ = s.storage.Delete(ctx, thumbnailKey)
		return nil, err
	}
	if err := s.storage.Upload(ctx, largeKey, largeBytes, "image/jpeg"); err != nil {
		_ = s.storage.Delete(ctx, originalKey)
		_ = s.storage.Delete(ctx, thumbnailKey)
		_ = s.storage.Delete(ctx, mediumKey)
		return nil, err
	}

	position := 0
	if input.Position != nil && *input.Position >= 0 {
		position = *input.Position
	} else if existing, getErr := svc.GetByProductID(storeID, productID); getErr == nil {
		position = len(*existing)
	}

	req := dto.CreateProductImageRequest{
		URL:          "/media/" + originalKey,
		URLThumbnail: "/media/" + thumbnailKey,
		URLMedium:    "/media/" + mediumKey,
		URLLarge:     "/media/" + largeKey,
		AltText:      input.AltText,
		Caption:      input.Caption,
		Position:     position,
		FileSize:     int64(len(input.Data)),
		FileType:     fileType,
	}

	if err := s.validationSvc.ValidateCreateImageRequest(req, s.maxFileSizeMB); err != nil {
		_ = s.storage.Delete(ctx, originalKey)
		_ = s.storage.Delete(ctx, thumbnailKey)
		_ = s.storage.Delete(ctx, mediumKey)
		_ = s.storage.Delete(ctx, largeKey)
		return nil, err
	}

	resp, err := svc.Create(storeID, productID, req)
	if err != nil {
		_ = s.storage.Delete(ctx, originalKey)
		_ = s.storage.Delete(ctx, thumbnailKey)
		_ = s.storage.Delete(ctx, mediumKey)
		_ = s.storage.Delete(ctx, largeKey)
		return nil, err
	}

	return resp, nil
}

func normalizeImageContentType(contentType string, data []byte, filename string) string {
	normalized := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if isAllowedImageType(normalized) {
		return normalized
	}

	if len(data) > 0 {
		detected := strings.ToLower(http.DetectContentType(data))
		detected = strings.TrimSpace(strings.Split(detected, ";")[0])
		if isAllowedImageType(detected) {
			return detected
		}
	}

	switch strings.ToLower(filepath.Ext(filename)) {
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	default:
		return normalized
	}
}

func isAllowedImageType(fileType string) bool {
	return fileType == "image/png" || fileType == "image/jpeg" || fileType == "image/webp"
}

func fileExtension(fileType string, filename string) string {
	switch fileType {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/jpeg":
		return ".jpg"
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".jpeg" {
		return ".jpg"
	}
	if ext != "" {
		return ext
	}
	return ".jpg"
}

func encodeResizedJPEG(img image.Image, width int, quality int) ([]byte, error) {
	bounds := img.Bounds()
	if bounds.Dx() == 0 || bounds.Dy() == 0 {
		return nil, fmt.Errorf("invalid image dimensions")
	}
	if width <= 0 {
		return nil, fmt.Errorf("invalid resize width")
	}
	if bounds.Dx() <= width {
		width = bounds.Dx()
	}
	height := int(float64(bounds.Dy()) * (float64(width) / float64(bounds.Dx())))
	if height <= 0 {
		height = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: quality}); err != nil {
		return nil, fmt.Errorf("encode resized image: %w", err)
	}
	return buf.Bytes(), nil
}
