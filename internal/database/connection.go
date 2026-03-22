package database

import (
	"fmt"
	"multitenancypfe/internal/auth/models"
	"multitenancypfe/internal/config"
	sfModels "multitenancypfe/internal/storefront/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(cfg config.Config) error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("postgres connection failed: %w", err)
	}

	// AutoMigrate tables in the public schema (platform-level + global indices)
	if err := DB.AutoMigrate(
		&models.PlatformAdmin{},
		&models.Tenant{},
		&sfModels.StoreSlugIndex{}, // global public slug routing table
	); err != nil {
		return fmt.Errorf("automigrate public schema failed: %w", err)
	}

	return nil
}
