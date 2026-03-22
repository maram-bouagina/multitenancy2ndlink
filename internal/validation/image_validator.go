package validation

import (
	"fmt"
	"net/url"
	"strings"
)

// ImageURLValidator valide les URLs d'images
type ImageURLValidator struct{}

// ValidImageExtensions contient les extensions autorisées pour les images
var ValidImageExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
}

// ValidateImageURL vérifie qu'une URL est valide pour une image
func (v *ImageURLValidator) ValidateImageURL(urlStr string) error {
	if urlStr == "" {
		return fmt.Errorf("image URL cannot be empty")
	}

	if strings.HasPrefix(urlStr, "/media/") {
		path := strings.ToLower(urlStr)
		hasValidExtension := false
		for ext := range ValidImageExtensions {
			if strings.HasSuffix(path, ext) {
				hasValidExtension = true
				break
			}
		}
		if !hasValidExtension {
			return fmt.Errorf("image URL must end with valid extension (.jpg, .jpeg, .png, .webp), got path: %s", path)
		}
		return nil
	}

	// Vérifier le format URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid image URL format: %w", err)
	}

	// Vérifier le scheme (http ou https)
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("image URL must use http or https scheme, got: %s", parsedURL.Scheme)
	}

	// Vérifier l'host existe
	if parsedURL.Host == "" {
		return fmt.Errorf("image URL must have a valid host")
	}

	// Vérifier l'extension du fichier
	path := strings.ToLower(parsedURL.Path)
	hasValidExtension := false
	for ext := range ValidImageExtensions {
		if strings.HasSuffix(path, ext) {
			hasValidExtension = true
			break
		}
	}

	if !hasValidExtension {
		return fmt.Errorf("image URL must end with valid extension (.jpg, .jpeg, .png, .webp), got path: %s", path)
	}

	return nil
}

// ValidateFileType vérifie que le type MIME est valide pour une image
func (v *ImageURLValidator) ValidateFileType(fileType string) error {
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}

	if !validTypes[fileType] {
		return fmt.Errorf("invalid image file type: %s (allowed: image/jpeg, image/png, image/webp)", fileType)
	}

	return nil
}

// ValidateFileSize vérifie que la taille du fichier est dans les limites
func (v *ImageURLValidator) ValidateFileSize(fileSize int64, maxSizeMB int64) error {
	maxSizeBytes := maxSizeMB * 1024 * 1024

	if fileSize <= 0 {
		return fmt.Errorf("file size must be greater than 0")
	}

	if fileSize > maxSizeBytes {
		return fmt.Errorf("file size %d bytes exceeds maximum allowed size of %d MB", fileSize, maxSizeMB)
	}

	return nil
}

// NewImageURLValidator crée une nouvelle instance du validateur
func NewImageURLValidator() *ImageURLValidator {
	return &ImageURLValidator{}
}
