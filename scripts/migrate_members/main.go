package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// This script populates the store_members table for existing stores
// Run this ONCE after deploying the membership system

type Store struct {
	ID       string `gorm:"column:id"`
	TenantID string `gorm:"column:tenant_id"`
}

type StoreMember struct {
	StoreID  string `gorm:"column:store_id"`
	UserID   string `gorm:"column:user_id"`
	TenantID string `gorm:"column:tenant_id"`
	Role     string `gorm:"column:role"`
}

func main() {
	// Get database connection from environment
	dbHost := getEnv("DB_HOST", "localhost")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "yourpassword")
	dbName := getEnv("DB_NAME", "multitenancy")
	dbPort := getEnv("DB_PORT", "5432")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		dbHost, dbUser, dbPassword, dbName, dbPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to database successfully")

	// Get all tenant schemas
	var schemas []string
	err = db.Raw(`
		SELECT schema_name 
		FROM information_schema.schemata 
		WHERE schema_name LIKE 'tenant_%'
	`).Scan(&schemas).Error
	if err != nil {
		log.Fatalf("Failed to get tenant schemas: %v", err)
	}

	log.Printf("Found %d tenant schemas\n", len(schemas))

	totalStores := 0
	totalMemberships := 0

	// For each tenant schema, get all stores and create memberships
	for _, schema := range schemas {
		// Extract tenant_id from schema name (tenant_xxx -> xxx)
		tenantID := schema[7:] // Remove "tenant_" prefix

		// Get all stores in this schema
		var stores []Store
		query := fmt.Sprintf("SELECT id, tenant_id FROM %s.stores WHERE deleted_at IS NULL", schema)
		err = db.Raw(query).Scan(&stores).Error
		if err != nil {
			log.Printf("Warning: Failed to get stores from schema %s: %v\n", schema, err)
			continue
		}

		log.Printf("Schema %s: Found %d stores\n", schema, len(stores))
		totalStores += len(stores)

		// Create membership entry for each store
		for _, store := range stores {
			// Check if membership already exists
			var count int64
			db.Table("store_members").
				Where("store_id = ? AND user_id = ?", store.ID, tenantID).
				Count(&count)

			if count > 0 {
				log.Printf("  - Store %s: Membership already exists, skipping\n", store.ID)
				continue
			}

			// Create owner membership
			member := StoreMember{
				StoreID:  store.ID,
				UserID:   tenantID,
				TenantID: tenantID,
				Role:     "owner",
			}

			err = db.Table("store_members").Create(&member).Error
			if err != nil {
				log.Printf("  - Store %s: Failed to create membership: %v\n", store.ID, err)
				continue
			}

			totalMemberships++
			log.Printf("  ✓ Store %s: Created owner membership for user %s\n", store.ID, tenantID)
		}
	}

	log.Println("\n========================================")
	log.Printf("Migration completed successfully!\n")
	log.Printf("Total stores processed: %d\n", totalStores)
	log.Printf("Total memberships created: %d\n", totalMemberships)
	log.Println("========================================")
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
