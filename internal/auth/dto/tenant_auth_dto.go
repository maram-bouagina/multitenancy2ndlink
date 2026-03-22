package dto

type CreateTenantRequest struct {
	Email     string  `json:"email"      validate:"required,email"`
	Password  string  `json:"password"   validate:"required,min=8"`
	FirstName string  `json:"first_name" validate:"required"`
	LastName  string  `json:"last_name"  validate:"required"`
	Phone     *string `json:"phone"`
	Plan      string  `json:"plan"       validate:"required,oneof=free pro enterprise"`
}

type UpdateTenantRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Phone     *string `json:"phone"`
	Avatar    *string `json:"avatar"`
	Plan      *string `json:"plan"   validate:"omitempty,oneof=free pro enterprise"`
	Status    *string `json:"status" validate:"omitempty,oneof=active unpaid suspended pending"`
}

type TenantResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	Phone         *string `json:"phone"`
	Avatar        *string `json:"avatar"`
	Plan          string  `json:"plan"`
	Status        string  `json:"status"`
	EmailVerified bool    `json:"email_verified"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token  string         `json:"token"`
	Tenant TenantResponse `json:"tenant"`
}
