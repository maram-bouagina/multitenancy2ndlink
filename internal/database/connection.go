package database

import (
	"fmt"
	"multitenancypfe/internal/auth/models"
	"multitenancypfe/internal/config"
	membershipModels "multitenancypfe/internal/membership/models"
	sfModels "multitenancypfe/internal/storefront/models"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// ── Better Auth tables (public schema) ────────────────────────────────────────
// Column names match Better Auth's camelCase convention exactly.

type BetterAuthUser struct {
	ID               string    `gorm:"column:id;primaryKey"`
	Name             string    `gorm:"column:name;not null"`
	Email            string    `gorm:"column:email;not null;uniqueIndex"`
	EmailVerified    bool      `gorm:"column:emailVerified;not null;default:false"`
	Image            *string   `gorm:"column:image"`
	TwoFactorEnabled bool      `gorm:"column:twoFactorEnabled;not null;default:false"`
	CreatedAt        time.Time `gorm:"column:createdAt;not null;autoCreateTime"`
	UpdatedAt        time.Time `gorm:"column:updatedAt;not null;autoUpdateTime"`
	FirstName        *string   `gorm:"column:firstName"`
	LastName         *string   `gorm:"column:lastName"`
	Phone            *string   `gorm:"column:phone"`
	Plan             *string   `gorm:"column:plan;default:free"`
	Role             *string   `gorm:"column:role;default:staff"`
	UserStatus       *string   `gorm:"column:userStatus;default:active"`
	StoreID          *string   `gorm:"column:storeId"`
	StoreSlug        *string   `gorm:"column:storeSlug"`
}

func (BetterAuthUser) TableName() string { return "user" }

type BetterAuthSession struct {
	ID        string    `gorm:"column:id;primaryKey"`
	ExpiresAt time.Time `gorm:"column:expiresAt;not null"`
	Token     string    `gorm:"column:token;not null;uniqueIndex"`
	CreatedAt time.Time `gorm:"column:createdAt;not null;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updatedAt;not null;autoUpdateTime"`
	IPAddress *string   `gorm:"column:ipAddress"`
	UserAgent *string   `gorm:"column:userAgent"`
	UserID    string    `gorm:"column:userId;not null;index"`
}

func (BetterAuthSession) TableName() string { return "session" }

type BetterAuthAccount struct {
	ID                    string     `gorm:"column:id;primaryKey"`
	AccountID             string     `gorm:"column:accountId;not null"`
	ProviderID            string     `gorm:"column:providerId;not null"`
	UserID                string     `gorm:"column:userId;not null;index"`
	AccessToken           *string    `gorm:"column:accessToken"`
	RefreshToken          *string    `gorm:"column:refreshToken"`
	IDToken               *string    `gorm:"column:idToken"`
	AccessTokenExpiresAt  *time.Time `gorm:"column:accessTokenExpiresAt"`
	RefreshTokenExpiresAt *time.Time `gorm:"column:refreshTokenExpiresAt"`
	Scope                 *string    `gorm:"column:scope"`
	Password              *string    `gorm:"column:password"`
	CreatedAt             time.Time  `gorm:"column:createdAt;not null;autoCreateTime"`
	UpdatedAt             time.Time  `gorm:"column:updatedAt;not null;autoUpdateTime"`
}

func (BetterAuthAccount) TableName() string { return "account" }

type BetterAuthVerification struct {
	ID         string     `gorm:"column:id;primaryKey"`
	Identifier string     `gorm:"column:identifier;not null"`
	Value      string     `gorm:"column:value;not null"`
	ExpiresAt  time.Time  `gorm:"column:expiresAt;not null"`
	CreatedAt  *time.Time `gorm:"column:createdAt"`
	UpdatedAt  *time.Time `gorm:"column:updatedAt"`
}

func (BetterAuthVerification) TableName() string { return "verification" }

type BetterAuthTwoFactor struct {
	ID          string `gorm:"column:id;primaryKey"`
	Secret      string `gorm:"column:secret;not null"`
	BackupCodes string `gorm:"column:backupCodes;not null"`
	UserID      string `gorm:"column:userId;not null;index"`
}

func (BetterAuthTwoFactor) TableName() string { return "twoFactor" }

// ──────────────────────────────────────────────────────────────────────────────

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

	// Use pgx v5 with SimpleProtocol to disable server-side prepared statements.
	// This prevents "cached plan must not change result type" errors after schema migrations.
	pgxCfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("pgx parse config failed: %w", err)
	}
	pgxCfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	sqlDB := stdlib.OpenDB(*pgxCfg)

	DB, err = gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("postgres connection failed: %w", err)
	}

	// AutoMigrate tables in the public schema (platform-level + Better Auth)
	if err := DB.AutoMigrate(
		&models.PlatformAdmin{},
		&models.Tenant{},
		&sfModels.StoreSlugIndex{},
		// Better Auth tables
		&BetterAuthUser{},
		&BetterAuthSession{},
		&BetterAuthAccount{},
		&BetterAuthVerification{},
		&BetterAuthTwoFactor{},
	); err != nil {
		return fmt.Errorf("automigrate public schema failed: %w", err)
	}

	// AutoMigrate membership tables (cross-tenant) — order matters: roles before members
	if err := DB.AutoMigrate(
		&membershipModels.StoreRole{},
		&membershipModels.StoreMember{},
		&membershipModels.StoreInvitation{},
	); err != nil {
		return fmt.Errorf("automigrate membership tables failed: %w", err)
	}

	return nil
}
