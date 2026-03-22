package services

import (
	"github.com/google/uuid"

	"multitenancypfe/internal/products/dto"
	"multitenancypfe/internal/products/models"
)

// ProductOperationService gère les opérations complexes sur les produits
type ProductOperationService interface {
	// CloneProduct duplique un produit existant (images optionnelles)
	CloneProduct(storeID uuid.UUID, sourceProductID uuid.UUID, req dto.CloneProductRequest) (*dto.CloneProductResponse, error)

	// AdjustStock ajuste le stock d'un produit (augmentation/réduction)
	AdjustStock(storeID, productID uuid.UUID, req dto.AdjustStockRequest) (*dto.StockAdjustmentResponse, error)

	// ReserveStock réserve du stock pour une commande (défaut: 30min d'expiration)
	ReserveStock(storeID, productID uuid.UUID, quantity int) (*dto.StockReservationResponse, error)

	// ReleaseReservation libère une réservation de stock
	ReleaseReservation(reservationID uuid.UUID) error

	// CheckStockAvailability vérifie la disponibilité du stock
	CheckStockAvailability(storeID, productID uuid.UUID, quantity int) (*models.Product, error)

	// GetLowStockAlerts retourne les produits avec alerte stock bas
	GetLowStockAlerts(storeID uuid.UUID) ([]dto.ProductResponse, error)
}
