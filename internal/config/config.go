package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPort     string
	DBSSLMode  string
	AppPort    string
	JWTSecret  string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		DBHost:     strings.TrimSpace(os.Getenv("DB_HOST")),
		DBUser:     strings.TrimSpace(os.Getenv("DB_USER")),
		DBPassword: strings.TrimSpace(os.Getenv("DB_PASSWORD")),
		DBName:     strings.TrimSpace(os.Getenv("DB_NAME")),
		DBPort:     strings.TrimSpace(os.Getenv("DB_PORT")),
		DBSSLMode:  strings.TrimSpace(os.Getenv("DB_SSLMODE")),
		AppPort:    strings.TrimSpace(os.Getenv("APP_PORT")),
		JWTSecret:  strings.TrimSpace(os.Getenv("JWT_SECRET")),
	}

	if cfg.DBHost == "" {
		return Config{}, fmt.Errorf("missing DB_HOST")
	}
	if cfg.DBUser == "" {
		return Config{}, fmt.Errorf("missing DB_USER")
	}
	if cfg.DBPassword == "" {
		return Config{}, fmt.Errorf("missing DB_PASSWORD")
	}
	if cfg.DBName == "" {
		return Config{}, fmt.Errorf("missing DB_NAME")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("missing JWT_SECRET")
	}
	if cfg.AppPort == "" {
		cfg.AppPort = "8000"
	}

	return cfg, nil
}
