package dto

type CreateAdminRequest struct {
	Email     string `json:"email"      validate:"required,email"`
	Password  string `json:"password"   validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name"  validate:"required"`
	Role      string `json:"role"       validate:"required,oneof=super_admin admin support"`
}

type UpdateAdminRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Role      *string `json:"role"   validate:"omitempty,oneof=super_admin admin support"`
	Status    *string `json:"status" validate:"omitempty,oneof=active suspended"`
}

type AdminResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
	Status    string `json:"status"`
}
