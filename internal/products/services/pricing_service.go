package services

import (
	"fmt"
	"time"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
)

// PricingService gère le calcul des prix effectifs et des soldes
type PricingService interface {
	// CalculateEffectivePrice calcule le prix effectif d'un produit (prix de base ou prix soldé)
	CalculateEffectivePrice(product *models.Product) (effectivePrice float64, onSale bool, expiresAt *time.Time)

	// EnrichProductWithPricing ajoute les informations de prix à la réponse
	EnrichProductWithPricing(product *models.Product, resp *dto.ProductResponse)

	// ValidateSalePeriod valide les dates de solde (fin >= début)
	ValidateSalePeriod(saleStart, saleEnd *time.Time) error

	// IsSaleActive vérifie si une solde est active maintenant
	IsSaleActive(product *models.Product) bool
}

// pricingService implémente PricingService
type pricingService struct{}

// NewPricingService crée une nouvelle instance du service de tarification
func NewPricingService() PricingService {
	return &pricingService{}
}

// CalculateEffectivePrice calcule le prix effectif d'un produit
// Règles de résolution du prix:
// 1. Si une solde est active (salePrice dans la période): retourner salePrice
// 2. Sinon: retourner Price (prix de base)
func (s *pricingService) CalculateEffectivePrice(product *models.Product) (effectivePrice float64, onSale bool, expiresAt *time.Time) {
	now := time.Now()

	// Vérifier si une solde est active
	if product.SalePrice != nil && s.isSalePeriodActive(product.SaleStart, product.SaleEnd, now) {
		return *product.SalePrice, true, product.SaleEnd
	}

	// Sinon retourner le prix de base
	return product.Price, false, nil
}

// EnrichProductWithPricing ajoute les informations de prix à la réponse
func (s *pricingService) EnrichProductWithPricing(product *models.Product, resp *dto.ProductResponse) {
	effectivePrice, onSale, expiresAt := s.CalculateEffectivePrice(product)
	resp.EffectivePrice = effectivePrice
	resp.OnSale = onSale
	resp.SaleExpiresAt = expiresAt
}

// ValidateSalePeriod valide les dates de solde
func (s *pricingService) ValidateSalePeriod(saleStart, saleEnd *time.Time) error {
	if saleStart == nil || saleEnd == nil {
		return nil // aucune solde, c'est valide
	}

	if saleEnd.Before(*saleStart) {
		return fmt.Errorf("sale end date cannot be before start date: start=%v, end=%v", saleStart, saleEnd)
	}

	return nil
}

// IsSaleActive vérifie si une solde est active maintenant
func (s *pricingService) IsSaleActive(product *models.Product) bool {
	_, onSale, _ := s.CalculateEffectivePrice(product)
	return onSale
}

// isSalePeriodActive vérifie si une période de solde est active à un moment donné
func (s *pricingService) isSalePeriodActive(saleStart, saleEnd *time.Time, now time.Time) bool {
	if saleStart == nil || saleEnd == nil {
		return false
	}

	return now.After(*saleStart) && now.Before(*saleEnd)
}
