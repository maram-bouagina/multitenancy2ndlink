package handlers

import (
	"github.com/gofiber/fiber/v2"

	"multitenancypfe/internal/auth/dto"
	"multitenancypfe/internal/auth/services"
	"multitenancypfe/internal/helpers"
)

type AdminHandler struct {
	svc services.AdminService
}

func NewAdminHandler(svc services.AdminService) *AdminHandler {
	return &AdminHandler{svc: svc}
}

func (h *AdminHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateAdminRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Create(req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *AdminHandler) GetAll(c *fiber.Ctx) error {
	admins, err := h.svc.GetAll()
	if err != nil {
		return helpers.Fail(c, fiber.StatusInternalServerError, err)
	}
	return c.JSON(admins)
}

func (h *AdminHandler) GetByID(c *fiber.Ctx) error {
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	admin, err := h.svc.GetByID(id)
	if err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.JSON(admin)
}

func (h *AdminHandler) Update(c *fiber.Ctx) error {
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	var req dto.UpdateAdminRequest
	if err := helpers.ParseBody(c, &req); err != nil {
		return err
	}
	resp, err := h.svc.Update(id, req)
	if err != nil {
		return helpers.Fail(c, fiber.StatusBadRequest, err)
	}
	return c.JSON(resp)
}

func (h *AdminHandler) Delete(c *fiber.Ctx) error {
	id, err := helpers.ParseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(id); err != nil {
		return helpers.Fail(c, fiber.StatusNotFound, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
