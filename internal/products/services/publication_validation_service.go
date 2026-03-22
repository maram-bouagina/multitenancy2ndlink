package services

import (
	"fmt"
	"time"

	"multitenancypfe/internal/products/models"
)

// PublicationValidationService valide les produits avant publication
type PublicationValidationService interface {
	// ValidateForPublication vérifie qu'un produit peut être publié
	ValidateForPublication(product *models.Product) error

	// GetPublicationErrors retourne une liste détaillée des erreurs
	GetPublicationErrors(product *models.Product) []string
}

// publicationValidationService implémente PublicationValidationService
type publicationValidationService struct{}

// NewPublicationValidationService crée une nouvelle instance
func NewPublicationValidationService() PublicationValidationService {
	return &publicationValidationService{}
}

// ValidateForPublication vérifie qu'un produit peut être publié
func (s *publicationValidationService) ValidateForPublication(product *models.Product) error {
	errors := s.GetPublicationErrors(product)
	if len(errors) > 0 {
		return fmt.Errorf("product cannot be published: %v", errors)
	}
	return nil
}

// GetPublicationErrors retourne une liste détaillée des erreurs
func (s *publicationValidationService) GetPublicationErrors(product *models.Product) []string {
	var errors []string

	// Vérifier champs obligatoires
	if product.Title == "" {
		errors = append(errors, "title is required")
	}

	if product.Price < 0 {
		errors = append(errors, "price must be >= 0")
	}

	if product.Price == 0 {
		errors = append(errors, "price must be greater than 0")
	}

	// Vérifier qu'il y a au moins une image (optionnel selon la config)
	// Ce champ devrait être défini dans les paramètres du store
	// Pour maintenant, on le met comme recommandation mais pas bloquant

	// Category is optional by default. Store-specific policies can enforce it separately.

	// Vérifier les dates de solde
	if product.SalePrice != nil {
		if *product.SalePrice < 0 {
			errors = append(errors, "sale_price must be >= 0")
		}

		if product.SaleStart != nil && product.SaleEnd != nil {
			if product.SaleEnd.Before(*product.SaleStart) {
				errors = append(errors, "sale_end cannot be before sale_start")
			}

			// Vérifier que la solde n'est pas entièrement dans le passé
			now := time.Now()
			if product.SaleEnd.Before(now) {
				errors = append(errors, "sale period has already expired")
			}
		}
	}

	// Vérifier SKU si suivi de stock activé
	if product.TrackStock && product.Stock < 0 {
		errors = append(errors, "stock cannot be negative when track_stock is enabled")
	}

	// Vérifier visibilité et statut
	if product.Status != models.StatusPublished && product.Status != models.StatusDraft && product.Status != models.StatusArchived {
		errors = append(errors, "invalid status: must be draft, published, or archived")
	}

	if product.Visibility != models.VisibilityPublic && product.Visibility != models.VisibilityPrivate {
		errors = append(errors, "invalid visibility: must be public or private")
	}

	// Vérifier que la devise est valide (3 caractères)
	if len(product.Currency) != 3 {
		errors = append(errors, "currency must be a 3-letter code")
	}

	// Vérifiabilité des dimensions
	if product.Weight != nil && *product.Weight < 0 {
		errors = append(errors, "weight must be >= 0")
	}

	return errors
}
