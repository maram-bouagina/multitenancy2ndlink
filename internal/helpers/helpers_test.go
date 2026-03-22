package helpers

import (
	"testing"

	"multitenancypfe/internal/auth/dto"
)

func TestValidateCreateTenantRequest(t *testing.T) {
	req := dto.CreateTenantRequest{
		Email:     "test@example.com",
		Password:  "short",
		FirstName: "Test",
		LastName:  "User",
		Plan:      "free",
	}

	err := validate.Struct(req)
	if err == nil {
		t.Fatalf("expected validation error for short password, got nil")
	}
}
