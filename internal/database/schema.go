package database

import (
	"context"
	"fmt"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	customerModels "multitenancypfe/internal/customers/models"
	productModels "multitenancypfe/internal/products/models"
	storeModel "multitenancypfe/internal/store/models"
)

var tenantSchemaReady sync.Map
var tenantSchemaInitLocks sync.Map

func withTenantSchemaInitLock(schema string, fn func() error) error {
	lockValue, _ := tenantSchemaInitLocks.LoadOrStore(schema, &sync.Mutex{})
	lock := lockValue.(*sync.Mutex)

	lock.Lock()
	defer lock.Unlock()

	if _, ok := tenantSchemaReady.Load(schema); ok {
		return nil
	}

	if err := fn(); err != nil {
		return err
	}

	tenantSchemaReady.Store(schema, struct{}{})
	return nil
}

func autoMigrateTenantModels(db *gorm.DB) error {
	// Widen avatar column if it was created as varchar(500) in an older schema.
	_ = db.Exec(`ALTER TABLE clients ALTER COLUMN avatar TYPE text`).Error

	if err := db.AutoMigrate(
		&storeModel.Store{},
		&productModels.Product{},
		&productModels.Category{},
		&productModels.Collection{},
		&productModels.ProductImage{},
		&productModels.ProductRelation{},
		&productModels.StockReservation{},
		&productModels.StockAdjustmentLog{},
		&productModels.Tag{},
		&productModels.ProductTag{},
		&customerModels.Customer{},
		&customerModels.CustomerAddress{},
		&customerModels.CustomerGroup{},
		&customerModels.CustomerGroupMember{},
		&storeModel.NewsletterSubscriber{},
		&storeModel.StorefrontPage{},
	); err != nil {
		return err
	}

	if err := ensureProductSlugCompositeUniqueIndex(db); err != nil {
		return err
	}

	if err := ensureTagSlugCompositeUniqueIndex(db); err != nil {
		return err
	}

	if err := ensureStorefrontPagesSlugIndex(db); err != nil {
		return err
	}

	return nil
}

func ensureStorefrontPagesSlugIndex(db *gorm.DB) error {
	err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_pages_store_slug
		ON storefront_pages (store_id, slug)
		WHERE deleted_at IS NULL
	`).Error
	if err != nil {
		return fmt.Errorf("idx_storefront_pages_store_slug: %w", err)
	}
	return nil
}

func ensureProductSlugCompositeUniqueIndex(db *gorm.DB) error {
	// Drop any legacy idx_slug_store that may have a different definition,
	// then recreate as a partial unique index for active rows only.
	// Use DO block to silently handle cases where the index is already correct.
	err := db.Exec(`
		DO $$
		BEGIN
			EXECUTE 'DROP INDEX IF EXISTS idx_slug_store';
			EXECUTE 'CREATE UNIQUE INDEX idx_slug_store ON products (store_id, slug) WHERE deleted_at IS NULL';
		EXCEPTION WHEN duplicate_table THEN
			NULL;
		END $$;
	`).Error
	if err != nil {
		return fmt.Errorf("ensure idx_slug_store failed: %w", err)
	}
	return nil
}

func ensureTagSlugCompositeUniqueIndex(db *gorm.DB) error {
	err := db.Exec(`
		DO $$
		BEGIN
			EXECUTE 'DROP INDEX IF EXISTS idx_tags_slug';
			EXECUTE 'DROP INDEX IF EXISTS idx_tag_slug_store';
			EXECUTE 'CREATE UNIQUE INDEX idx_tag_slug_store ON tags (store_id, slug) WHERE deleted_at IS NULL';
		EXCEPTION WHEN duplicate_table THEN
			NULL;
		END $$;
	`).Error
	if err != nil {
		return fmt.Errorf("ensure idx_tag_slug_store failed: %w", err)
	}
	return nil
}

func CreateTenantSchema(tenantID string) error {
	schema := fmt.Sprintf("tenant_%s", tenantID)

	return withTenantSchemaInitLock(schema, func() error {
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
			return fmt.Errorf("set search_path failed: %w", err)
		}

		// 4. Open a GORM session on that pinned connection
		scopedDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{})
		if err != nil {
			return fmt.Errorf("open scoped db failed: %w", err)
		}

		// 5. AutoMigrate inside the tenant schema (creates tables if they don't exist)
		if err := autoMigrateTenantModels(scopedDB); err != nil {
			return fmt.Errorf("automigrate failed: %w", err)
		}

		return nil
	})
}

func EnsureTenantSchemaUpToDate(tenantID string) error {
	schema := fmt.Sprintf("tenant_%s", tenantID)
	if _, ok := tenantSchemaReady.Load(schema); ok {
		return nil
	}

	return withTenantSchemaInitLock(schema, func() error {
		// Ensure the schema itself exists (lazy creation for Better Auth users)
		if err := DB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %q", schema)).Error; err != nil {
			return fmt.Errorf("create schema failed: %w", err)
		}

		// Use a dedicated connection so SET search_path and AutoMigrate
		// run on the same connection (not random pool connections).
		sqlDB, err := DB.DB()
		if err != nil {
			return fmt.Errorf("get sql.DB failed: %w", err)
		}

		conn, err := sqlDB.Conn(context.Background())
		if err != nil {
			return fmt.Errorf("get connection failed: %w", err)
		}
		defer conn.Close()

		if _, err := conn.ExecContext(context.Background(),
			fmt.Sprintf("SET search_path TO %q, public", schema),
		); err != nil {
			return fmt.Errorf("set search_path failed: %w", err)
		}

		scopedDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{})
		if err != nil {
			return fmt.Errorf("open scoped db failed: %w", err)
		}

		if err := autoMigrateTenantModels(scopedDB); err != nil {
			return fmt.Errorf("automigrate failed: %w", err)
		}

		return nil
	})
}
