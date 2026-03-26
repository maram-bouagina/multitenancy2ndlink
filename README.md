# MultiTenancy PFE — Multi-Tenant E-Commerce Platform

A full-stack multi-tenant SaaS e-commerce platform. Each tenant (merchant) gets a fully isolated PostgreSQL schema, their own product catalog, store customization, and a public-facing storefront.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Testing & QA](#testing--qa)
- [Useful Service URLs](#useful-service-urls)
- [Troubleshooting](#troubleshooting)
- [Code Structure Highlights](#code-structure-highlights)

---

## Architecture Overview

```
Browser (Next.js :3000)
        │  Axios — cookie: auth_token (withCredentials)
        ▼
GoFiber API (:8000)
  ├── /api/auth/**                    ← Public: login, register
  ├── /api/stores/**                  ← Auth-guarded, tenant-scoped
  ├── /api/stores/:id/products/**     ← Auth-guarded, tenant-scoped
  └── /api/public/stores/:slug/**     ← Unauthenticated storefront
        │
        ▼
PostgreSQL (schema-per-tenant isolation)
  public:            tenants, platform_admins, store_slug_index
  tenant_<uuid>:     stores, products, categories, collections,
                     tags, product_images, stock_*

MinIO (:9000) ← Product images and media assets
```

Each tenant gets a **dedicated PostgreSQL schema** (`tenant_<uuid>`) that is automatically provisioned and migrated on first request. This provides complete data isolation between tenants.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.25, GoFiber v2 |
| ORM | GORM + `gorm.io/driver/postgres` |
| Database | PostgreSQL 18 |
| Authentication | Better Auth v1.5 (primary, tenant + customer, 2FA, OAuth) |
| Auth fallback | JWT HMAC-SHA256 — `auth_token` cookie (legacy Go endpoints) |
| Object Storage | MinIO (S3-compatible) |
| Excel Import/Export | `xuri/excelize/v2` |
| Email | Nodemailer (verification, password reset) |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4, Radix UI |
| Data Fetching | TanStack React Query v5, Axios |
| Forms | react-hook-form + Zod |
| Storefront Builder | Puck Editor (`@puckeditor/core`) — visual drag-and-drop |
| Drag & Drop | dnd-kit (product/image reordering) |
| Containerization | Docker (multi-stage), Docker Compose |
| DB Admin | pgAdmin 4 |

---

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended) **or**
- [Go 1.25+](https://go.dev/dl/) and [Node.js 20+](https://nodejs.org/) for local development
- Git

---

## Getting Started

### 1. Clone & Configure Environment

```bash
git clone <repository-url>
cd multitenancypfe
```

**Backend `.env`** — create a `.env` file at the project root:

```env
# Database
DB_HOST=go_db           # Use "localhost" for local dev (not Docker)
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=multitenancy
DB_PORT=5432
DB_SSLMODE=disable

# Application
APP_PORT=8000
JWT_SECRET=your-super-secret-jwt-key-change-this

# MinIO Object Storage
MINIO_ENDPOINT=minio:9000   # Use "localhost:9000" for local dev
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=product-media
MINIO_USE_SSL=false

# pgAdmin (optional)
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin
```

**Frontend `.env.local`** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=change-this-to-a-random-32-char-secret
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5433/multitenancy
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="MultiTenancy PFE <noreply@example.com>"
NEXT_PUBLIC_GOOGLE_ENABLED=false
NEXT_PUBLIC_FACEBOOK_ENABLED=false
```

---

### 2. Run with Docker (Recommended)

```bash
docker-compose up --build -d
```

To view logs:
```bash
docker-compose logs -f go-app
```

To stop all services:
```bash
docker-compose down
```

To stop and remove volumes (full reset):
```bash
docker-compose down -v
```

The frontend is **not** included in Docker Compose. Run it separately:

```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

### 3. Run Locally (Without Docker)

You will need a running PostgreSQL instance and MinIO instance accessible locally. Update your `.env` to point to `localhost` instead of the Docker service names.

**Backend:**
```bash
# From project root
go mod download
go run main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Build the frontend for production:**
```bash
cd frontend
npm run build
npm start
```

---

## Project Structure

```
.
├── main.go                  # Entry point — Fiber app, middleware, route registration
├── docker-compose.yml
├── dockerfile               # Multi-stage build
├── go.mod
├── .env                     # (not committed) Backend environment variables
├── docs/                    # Project documentation and acceptance criteria
├── scripts/
│   └── run_api_tests.ps1    # PowerShell integration test suite
├── internal/
│   ├── auth/                # Tenant & platform admin auth (login, register, JWT)
│   │   ├── dto/             # Request/response DTOs
│   │   ├── handlers/        # HTTP handlers
│   │   ├── models/          # GORM models (Tenant, PlatformAdmin)
│   │   ├── repo/            # Database layer
│   │   ├── routes/          # Route declarations
│   │   └── services/        # Business logic
│   ├── config/              # .env loader, Config struct
│   ├── database/            # DB connection, public schema migration,
│   │                        # per-tenant schema provisioning
│   ├── helpers/             # Shared utility functions
│   ├── jwt/                 # JWT sign / verify
│   ├── media/               # MinIO storage wrapper
│   ├── middleware/          # RequireAuth, TenantDB (schema resolver)
│   ├── products/            # Products, categories, collections, tags,
│   │                        # images, stock, import/export, search
│   ├── routes/              # Top-level route registration
│   ├── store/               # Store CRUD, theme customization, draft/publish workflow
│   ├── storefront/          # Public unauthenticated storefront API (by slug)
│   └── validation/          # Image validation rules
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router pages
    │   │   ├── auth/        # Login and register pages
    │   │   ├── dashboard/   # Protected dashboard (products, stores, categories…)
    │   │   └── store/       # Store-specific pages
    │   ├── components/
    │   │   ├── ui/          # shadcn/ui base components
    │   │   └── dashboard/   # Composite dashboard components
    │   └── lib/
    │       ├── api/         # Axios client, error helpers
    │       ├── hooks/       # useAuth, React Query hooks
    │       └── types/       # TypeScript interfaces
    └── public/
```

---

## API Reference

See the full API reference in the original README for all endpoints and request/response details. Key endpoints for testing:

- **Auth:** `/api/auth/tenant/login`, `/api/tenants`, `/api/auth/tenant/me`
- **Stores:** `/api/stores`, `/api/stores/:id`
- **Products:** `/api/stores/:storeId/products`, `/api/stores/:storeId/products/import`, `/api/stores/:storeId/products/export`

---

## Testing & QA

### 1. Full Integration Test Suite

A ready-to-use PowerShell script is provided to test all major API flows (tenant registration, login, store/product CRUD, validation errors).

**How to run:**
```powershell
# From the project root, with the API running (Docker or local)
./scripts/run_api_tests.ps1
```

**What it does:**
- Registers a new tenant (with unique email)
- Tests invalid plan, short password, and duplicate email
- Logs in, tests wrong password and unknown email
- Creates a store (valid, missing fields, duplicate slug)
- Creates a product (valid, missing/invalid fields, negative price, wrong currency, sale date logic)
- Deletes the product and verifies deletion
- Prints colored pass/fail status for each step

**Requirements:**
- Windows PowerShell 5.1+ (or run in VS Code terminal)
- API must be running at `http://localhost:8000`

---

### 2. Manual API Testing (with Postman or curl)

- Use the API reference for all endpoints and required fields.
- For authentication, use `/api/auth/tenant/login` to get a JWT token, then pass it as `Authorization: Bearer <token>` for protected routes.

---

### 3. Product Import/Export (Excel/CSV)

- Download the import template from the dashboard or via:
  ```
  GET /api/stores/:storeId/products/import/template
  ```
- Fill in your products in Excel or CSV. **Do not use TypeScript/JS code — use real spreadsheet data.**
- Required columns:
  `id,title,slug,description,status,visibility,price,sale_price,currency,sku,track_stock,stock,low_stock_threshold,weight,dimensions,brand,tax_class,category_id,category_slug,category_name,published_at,image_url,image_urls`
- For multiple images, separate URLs in `image_urls` with `|` (pipe), `,` (comma), or `;` (semicolon).
- Import via dashboard or:
  ```
  POST /api/stores/:storeId/products/import
  ```
  (multipart/form-data, field: `file`)

---

### 4. Frontend Testing

- Start the frontend:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- Open [http://localhost:3000](http://localhost:3000)
- Register/login, create a store, add products, test import/export, and verify images.

---

### 5. Troubleshooting

- If you see "relation does not exist" errors, restart the API after the DB is ready.
- For CORS issues, check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.
- For MinIO issues, check the MinIO console at [http://localhost:9001](http://localhost:9001).

---

## Useful Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend (dev) | http://localhost:3000 | Next.js dev server |
| API | http://localhost:8000 | GoFiber |
| API Health | http://localhost:8000/health | Should return `{ "status": "ok" }` |
| pgAdmin | http://localhost:5050 | PostgreSQL admin UI |
| MinIO Console | http://localhost:9001 | Object storage dashboard |
| PostgreSQL | localhost:5433 | Direct DB access (host port mapping) |

---

## Code Structure Highlights

- **Layered Architecture:**
  - HTTP Handler → Service (interface) → Repository → GORM Model
- **Interface-Driven Services:**
  - Core business logic is expressed as Go interfaces, making services testable in isolation.
- **Schema-Per-Tenant Multitenancy:**
  - Each tenant gets a dedicated PostgreSQL schema, provisioned and migrated automatically.
- **Secure Authentication:**
  - JWT in HttpOnly cookie, bcrypt password hashing, safe DTOs, soft-delete reactivation.
- **Safe Storefront DB Isolation:**
  - Dedicated DB connection per storefront request, prevents cross-tenant leakage.
- **DRY Request Handling:**
  - Helpers for body parsing, validation, route/user extraction.
- **Data Integrity:**
  - Soft deletes, UUID PKs, DB-level CHECK constraints for enums.

---
