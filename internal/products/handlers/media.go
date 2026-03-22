package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/media"
)

type MediaHandler struct {
	storage media.Storage
}

func NewMediaHandler(storage media.Storage) *MediaHandler {
	return &MediaHandler{storage: storage}
}

// GET /media/*
func (h *MediaHandler) Serve(c *fiber.Ctx) error {
	key := strings.TrimSpace(c.Params("*"))
	if key == "" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	reader, contentType, err := h.storage.Get(c.Context(), key)
	if err != nil {
		return c.SendStatus(fiber.StatusNotFound)
	}
	defer reader.Close()

	c.Set("Cache-Control", "public, max-age=31536000, immutable")
	c.Type(contentType)
	return c.SendStream(reader)
}
