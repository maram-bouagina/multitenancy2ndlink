package database

import (
	"context"
	"fmt"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	productModels "multitenancypfe/internal/products/models"
	storeModel "multitenancypfe/internal/store/models"
)

var tenantSchemaReady sync.Map

func autoMigrateTenantModels(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&storeModel.Store{},
		&productModels.Product{},
		&productModels.Category{},
		&productModels.Collection{},
		&productModels.ProductImage{},
		&productModels.StockReservation{},
		&productModels.StockAdjustmentLog{},
		&productModels.Tag{},
		&productModels.ProductTag{},
	); err != nil {
		return err
	}

	if err := ensureProductSlugCompositeUniqueIndex(db); err != nil {
		return err
	}

	return nil
}

func ensureProductSlugCompositeUniqueIndex(db *gorm.DB) error {
	// Legacy schemas may have idx_slug_store on (slug) only or as non-partial unique.
	// Keep uniqueness only for active rows to allow slug reuse after soft delete.
	if err := db.Exec(`DROP INDEX IF EXISTS idx_slug_store`).Error; err != nil {
		return fmt.Errorf("drop legacy idx_slug_store failed: %w", err)
	}
	if err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_slug_store ON products (store_id, slug) WHERE deleted_at IS NULL`).Error; err != nil {
		return fmt.Errorf("create partial idx_slug_store failed: %w", err)
	}
	return nil
}

func CreateTenantSchema(tenantID string) error {
	schema := fmt.Sprintf("tenant_%s", tenantID)

	// 1. Create the schema
	if err := DB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %q", schema)).Error; err != nil {
		return fmt.Errorf("create schema failed: %w", err)
	}

	// 2. Get the underlying *sql.DB and open a dedicated connection
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("get sql.DB failed: %w", err)
	}

	conn, err := sqlDB.Conn(context.Background())
	if err != nil {
		return fmt.Errorf("get connection failed: %w", err)
	}
	defer conn.Close()

	// 3. Pin search_path to tenant schema on this connection
	if _, err := conn.ExecContext(context.Background(),
		fmt.Sprintf("SET search_path TO %q, public", schema),
	); err != nil {
		conn.Close()
		return fmt.Errorf("set search_path failed: %w", err)
	}

	// 4. Open a GORM session on that pinned connection
	scopedDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{})
	if err != nil {
		conn.Close()
		return fmt.Errorf("open scoped db failed: %w", err)
	}

	// 5. AutoMigrate inside the tenant schema (creates tables if they don't exist)
	if err := autoMigrateTenantModels(scopedDB); err != nil {
		conn.Close()
		return fmt.Errorf("automigrate failed: %w", err)
	}

	conn.Close()
	tenantSchemaReady.Store(schema, struct{}{})
	return nil
}

func EnsureTenantSchemaUpToDate(tenantID string) error {
	schema := fmt.Sprintf("tenant_%s", tenantID)
	if _, ok := tenantSchemaReady.Load(schema); ok {
		return nil
	}

	scopedDB := DB.Session(&gorm.Session{})
	if err := scopedDB.Exec(fmt.Sprintf(`SET search_path = "%s", public`, schema)).Error; err != nil {
		return fmt.Errorf("set search_path failed: %w", err)
	}

	if err := autoMigrateTenantModels(scopedDB); err != nil {
		return fmt.Errorf("automigrate failed: %w", err)
	}

	tenantSchemaReady.Store(schema, struct{}{})
	return nil
}
