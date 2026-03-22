package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"multitenancypfe/internal/config"
	"multitenancypfe/internal/database"
	"multitenancypfe/internal/jwt"
	"multitenancypfe/internal/routes"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config failed: %v", err)
	}

	if err := database.Connect(cfg); err != nil {
		log.Fatalf("database failed: %v", err)
	}

	jwt.Init(cfg.JWTSecret)

	app := fiber.New()

	// Enable CORS for local development (Next.js running on localhost:3000)
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowCredentials: true,
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	routes.Register(app, database.DB)

	log.Printf("API running on :%s", cfg.AppPort)
	log.Fatal(app.Listen(":" + cfg.AppPort))
}
