package services

import (
	"fmt"
	"regexp"
	"strconv"

	"multitenancypfe/internal/products/models"
)

// CollectionRuleEngine évalue les règles automatiques pour les collections
type CollectionRuleEngine interface {
	// EvaluateRule évalue si un produit répond à une règle
	EvaluateRule(product *models.Product, rule string) (bool, error)

	// ValidateRule vérifie si la syntaxe d'une règle est valide
	ValidateRule(rule string) error
}

// collectionRuleEngine implémente CollectionRuleEngine
type collectionRuleEngine struct{}

// NewCollectionRuleEngine crée une nouvelle instance du moteur de règles
func NewCollectionRuleEngine() CollectionRuleEngine {
	return &collectionRuleEngine{}
}

// EvaluateRule évalue si un produit répond à une règle
// Syntaxe supportée: "price > 50", "price >= 100", "price < 200", "stock > 0", "status = published"
func (e *collectionRuleEngine) EvaluateRule(product *models.Product, rule string) (bool, error) {
	if rule == "" {
		return true, nil // règle vide = tous les produits
	}

	// Parser la règle (format simple: "field operator value")
	// Exemples: "price > 50", "stock >= 10", "status = published"

	// Regex pour parser: "champ operateur valeur"
	re := regexp.MustCompile(`^(\w+)\s*(>=|<=|>|<|=)\s*(.+)$`)
	matches := re.FindStringSubmatch(rule)
	if len(matches) != 4 {
		return false, fmt.Errorf("invalid rule format: %s (expected 'field operator value')", rule)
	}

	field := matches[1]
	operator := matches[2]
	value := matches[3]

	// Évaluer selon le champ
	switch field {
	case "price":
		priceValue, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return false, fmt.Errorf("invalid price value: %s", value)
		}
		return e.evaluateNumeric(product.Price, operator, priceValue)

	case "stock":
		stockValue, err := strconv.Atoi(value)
		if err != nil {
			return false, fmt.Errorf("invalid stock value: %s", value)
		}
		return e.evaluateNumeric(float64(product.Stock), operator, float64(stockValue))

	case "status":
		return e.evaluateString(string(product.Status), operator, value)

	case "visibility":
		return e.evaluateString(string(product.Visibility), operator, value)

	case "brand":
		if product.Brand == nil {
			return false, nil
		}
		return e.evaluateString(*product.Brand, operator, value)

	default:
		return false, fmt.Errorf("unknown field: %s", field)
	}
}

// ValidateRule vérifie si la syntaxe d'une règle est valide
func (e *collectionRuleEngine) ValidateRule(rule string) error {
	if rule == "" {
		return nil // règle vide valide
	}

	re := regexp.MustCompile(`^(\w+)\s*(>=|<=|>|<|=)\s*(.+)$`)
	if !re.MatchString(rule) {
		return fmt.Errorf("invalid rule syntax: %s", rule)
	}

	// Tester avec un produit dummy pour vérifier la validité
	dummyProduct := &models.Product{
		Price:      100,
		Stock:      10,
		Status:     models.StatusPublished,
		Visibility: models.VisibilityPublic,
		Brand:      stringPtr("Test"),
	}

	_, err := e.EvaluateRule(dummyProduct, rule)
	return err
}

// evaluateNumeric compare deux nombres selon l'opérateur
func (e *collectionRuleEngine) evaluateNumeric(productValue float64, operator string, ruleValue float64) (bool, error) {
	switch operator {
	case ">":
		return productValue > ruleValue, nil
	case ">=":
		return productValue >= ruleValue, nil
	case "<":
		return productValue < ruleValue, nil
	case "<=":
		return productValue <= ruleValue, nil
	case "=":
		return productValue == ruleValue, nil
	default:
		return false, fmt.Errorf("unsupported operator: %s", operator)
	}
}

// evaluateString compare deux chaînes selon l'opérateur
func (e *collectionRuleEngine) evaluateString(productValue string, operator string, ruleValue string) (bool, error) {
	switch operator {
	case "=":
		return productValue == ruleValue, nil
	case "!=":
		return productValue != ruleValue, nil
	default:
		return false, fmt.Errorf("operator %s not supported for string comparison", operator)
	}
}

// stringPtr retourne un pointeur vers une chaîne
func stringPtr(s string) *string {
	return &s
}
