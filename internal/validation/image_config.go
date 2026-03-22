package validation

import "fmt"

// ImageValidationConfig contient les paramètres de validation des images
type ImageValidationConfig struct {
	MaxFileSizeMB          int64
	AllowedExtensions      map[string]bool
	AllowedMimeTypes       map[string]bool
	RequireImageDimensions bool
}

// DefaultImageValidationConfig retourne la configuration par défaut
func DefaultImageValidationConfig() *ImageValidationConfig {
	return &ImageValidationConfig{
		MaxFileSizeMB: 10, // 10 MB par défaut
		AllowedExtensions: map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".webp": true,
		},
		AllowedMimeTypes: map[string]bool{
			"image/jpeg": true,
			"image/png":  true,
			"image/webp": true,
		},
		RequireImageDimensions: false,
	}
}

// ValidateImageDimensions vérifie les dimensions de l'image (optionnel)
func ValidateImageDimensions(width, height int, minWidth, minHeight, maxWidth, maxHeight int) error {
	if width <= 0 || height <= 0 {
		return fmt.Errorf("image dimensions must be positive: width=%d, height=%d", width, height)
	}

	if width < minWidth || height < minHeight {
		return fmt.Errorf("image dimensions too small: minimum %dx%d, got %dx%d", minWidth, minHeight, width, height)
	}

	if maxWidth > 0 && width > maxWidth || maxHeight > 0 && height > maxHeight {
		return fmt.Errorf("image dimensions too large: maximum %dx%d, got %dx%d", maxWidth, maxHeight, width, height)
	}

	return nil
}

// SummaryValidationErrors crée un message d'erreur lisible à partir de plusieurs erreurs
func SummaryValidationErrors(errs []error) string {
	if len(errs) == 0 {
		return ""
	}

	summary := "Image validation errors:\n"
	for i, err := range errs {
		summary += fmt.Sprintf("%d. %v\n", i+1, err)
	}
	return summary
}
