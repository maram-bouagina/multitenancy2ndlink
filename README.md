# MultiTenancy PFE — Multi-Tenant E-Commerce Platform

A full-stack multi-tenant SaaS e-commerce platform. Each tenant (merchant) gets a fully isolated PostgreSQL schema, their own product catalog, store customization, and a public-facing storefront.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone & Configure Environment](#1-clone--configure-environment)
  - [2. Run with Docker (Recommended)](#2-run-with-docker-recommended)
  - [3. Run Locally (Without Docker)](#3-run-locally-without-docker)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
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
| Authentication | JWT (HMAC-SHA256, 24h, cookie-based) |
| Object Storage | MinIO (S3-compatible) |
| Excel Import/Export | `xuri/excelize/v2` |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui, Tailwind CSS v4, Radix UI |
| Data Fetching | TanStack React Query v5, Axios |
| Forms | react-hook-form + Zod |
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
```

---

### 2. Run with Docker (Recommended)

This starts all services: Go API, PostgreSQL, MinIO, and pgAdmin.

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

The frontend is **not** included in Docker Compose. Run it separately (see below).

**Start the frontend:**
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

All authenticated endpoints require the `auth_token` cookie (set automatically on login) or an `Authorization: Bearer <token>` header.

### Tenant Registration

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tenants` | No | Register a new tenant account |
| `GET` | `/api/tenants` | No | List all tenants |
| `GET` | `/api/tenants/:id` | No | Get tenant by ID |
| `PUT` | `/api/tenants/:id` | No | Update tenant |
| `DELETE` | `/api/tenants/:id` | No | Soft-delete tenant |
| `POST` | `/api/tenants/:id/restore` | No | Restore a soft-deleted tenant |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/tenant/login` | No | Login — sets `auth_token` HttpOnly cookie |
| `POST` | `/api/auth/tenant/logout` | Yes | Clear session cookie |
| `GET` | `/api/auth/tenant/me` | Yes | Get current tenant profile |

### Platform Admins

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admins` | No | Create a platform admin |
| `GET` | `/api/admins` | No | List all admins |
| `GET` | `/api/admins/:id` | No | Get admin by ID |
| `PUT` | `/api/admins/:id` | No | Update admin |
| `DELETE` | `/api/admins/:id` | No | Delete admin |

### Stores

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores` | Yes | List tenant's stores |
| `POST` | `/api/stores` | Yes | Create a new store |
| `GET` | `/api/stores/:id` | Yes | Get store details |
| `PUT` | `/api/stores/:id` | Yes | Update store settings / save draft customization |
| `DELETE` | `/api/stores/:id` | Yes | Delete a store |
| `POST` | `/api/stores/:id/customization/publish` | Yes | Publish storefront draft |

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores/:storeId/products` | Yes | List products (paginated, filterable) |
| `POST` | `/api/stores/:storeId/products` | Yes | Create product |
| `GET` | `/api/stores/:storeId/products/:id` | Yes | Get product |
| `PUT` | `/api/stores/:storeId/products/:id` | Yes | Update product |
| `DELETE` | `/api/stores/:storeId/products/:id` | Yes | Delete product |
| `POST` | `/api/stores/:storeId/products/:id/clone` | Yes | Clone a product |
| `GET` | `/api/stores/:storeId/products/search` | Yes | Search products |
| `POST` | `/api/stores/:storeId/products/import` | Yes | Bulk import from Excel |
| `GET` | `/api/stores/:storeId/products/export` | Yes | Export catalog to Excel |
| `GET` | `/api/stores/:storeId/products/import/template` | Yes | Download Excel import template |
| `POST` | `/api/stores/:storeId/products/:id/stock/adjust` | Yes | Adjust stock quantity |
| `POST` | `/api/stores/:storeId/products/:id/stock/reserve` | Yes | Reserve stock |

### Product Images

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/stores/:storeId/products/:productId/images` | Yes | Upload product image |
| `GET` | `/api/stores/:storeId/products/:productId/images` | Yes | List product images |
| `PUT` | `/api/stores/:storeId/products/:productId/images/:imageId` | Yes | Update image metadata |
| `DELETE` | `/api/stores/:storeId/products/:productId/images/:imageId` | Yes | Delete product image |
| `POST` | `/api/stores/:storeId/products/:productId/images/reorder` | Yes | Reorder product images |

### Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores/:storeId/categories` | Yes | List category tree |
| `POST` | `/api/stores/:storeId/categories` | Yes | Create category |
| `GET` | `/api/stores/:storeId/categories/:id` | Yes | Get category by ID |
| `PUT` | `/api/stores/:storeId/categories/:id` | Yes | Update category |
| `DELETE` | `/api/stores/:storeId/categories/:id` | Yes | Delete category |
| `POST` | `/api/stores/:storeId/categories/import` | Yes | Bulk import from Excel |
| `GET` | `/api/stores/:storeId/categories/export` | Yes | Export categories to Excel |
| `GET` | `/api/stores/:storeId/categories/import/template` | Yes | Download Excel import template |

### Collections

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores/:storeId/collections` | Yes | List collections |
| `POST` | `/api/stores/:storeId/collections` | Yes | Create collection |
| `GET` | `/api/stores/:storeId/collections/:id` | Yes | Get collection by ID |
| `PUT` | `/api/stores/:storeId/collections/:id` | Yes | Update collection |
| `DELETE` | `/api/stores/:storeId/collections/:id` | Yes | Delete collection |
| `GET` | `/api/stores/:storeId/collections/:id/products` | Yes | List products in a collection |
| `POST` | `/api/stores/:storeId/collections/:id/products/:productId` | Yes | Add product to collection |
| `DELETE` | `/api/stores/:storeId/collections/:id/products/:productId` | Yes | Remove product from collection |

### Tags

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores/:storeId/tags` | Yes | List tags |
| `POST` | `/api/stores/:storeId/tags` | Yes | Create tag |
| `GET` | `/api/stores/:storeId/tags/:id` | Yes | Get tag by ID |
| `PUT` | `/api/stores/:storeId/tags/:id` | Yes | Update tag |
| `DELETE` | `/api/stores/:storeId/tags/:id` | Yes | Delete tag |
| `POST` | `/api/stores/:storeId/products/:productId/tags` | Yes | Assign tags to a product |

### Public Storefront (Unauthenticated)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/stores/:slug` | Get store info by slug |
| `GET` | `/api/public/stores/:slug/products` | List published products |
| `GET` | `/api/public/stores/:slug/products/:productSlug` | Get product detail |
| `GET` | `/api/public/stores/:slug/categories` | List categories |
| `GET` | `/api/public/stores/:slug/collections` | List collections |
| `GET` | `/api/public/stores/:slug/collections/:colSlug` | Get products in a collection |

### Media

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/media/*` | No | Serve a media file by path |

### Health Check

```
GET /health  →  200 OK  {"status": "ok"}
```

---

## Running Tests

### Integration Test Suite (PowerShell)

The script at `scripts/run_api_tests.ps1` runs a full end-to-end flow against the running API:

```powershell
# Make sure the API is running first (Docker or local)
.\scripts\run_api_tests.ps1
```

The script:
1. Registers a new tenant (unique suffix per run)
2. Logs in and extracts the JWT token
3. Creates a store
4. Runs CRUD tests for products, categories, collections, and tags
5. Prints colored pass/fail status for each step

### Unit Tests (Go)

```bash
go test ./internal/...
```

---

## Useful Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend (dev) | http://localhost:3000 | Next.js dev server |
| API | http://localhost:8000 | GoFiber |
| API Health | http://localhost:8000/health | Should return `{"status":"ok"}` |
| pgAdmin | http://localhost:5050 | PostgreSQL admin UI |
| MinIO Console | http://localhost:9001 | Object storage dashboard |
| PostgreSQL | localhost:5433 | Direct DB access (host port mapping) |

**pgAdmin first-time setup:**
1. Open http://localhost:5050
2. Log in with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` from your `.env`
3. Add a new server: host = `go_db`, port = `5432`, user/password from `.env`

---

## Troubleshooting

**API container keeps restarting**
- Check logs: `docker-compose logs go-app`
- Verify all required `.env` fields are set (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`)
- Ensure the `go_db` container is healthy before the app starts

**`relation "tenants" does not exist`**
- The database was not migrated. Restart the `go-app` container after the DB is ready:
  ```bash
  docker-compose restart go-app
  ```

**CORS errors in the browser**
- Make sure `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches exactly where the API is running
- The API only allows `http://localhost:3000` by default

**MinIO bucket not found**
- The application auto-creates the bucket on startup. If it fails, check MinIO is running:
  ```bash
  docker-compose logs minio
  ```
- Or create the bucket manually via the MinIO Console at http://localhost:9001

**Frontend build errors**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

**Port conflicts**
- API: 8000, Frontend: 3000, PostgreSQL: 5433 (host), pgAdmin: 5050, MinIO: 9000/9001
- Change host ports in `docker-compose.yml` if any are already in use

---

## Code Structure Highlights

### Layered Architecture

Every domain (`auth`, `store`, `products`, `storefront`) follows an identical layer stack:

```
HTTP Handler  →  Service (interface)  →  Repository  →  GORM Model
```

This consistency makes the codebase easy to navigate — if you know where to look in one domain, you know where to look in all of them.

### Interface-Driven Services

Core business logic is expressed as Go interfaces (`PricingService`, `CollectionRuleEngine`, `PublicationValidationService`). Handlers depend on the interface, not the concrete type. This means services can be tested in isolation with a mock, without spinning up a database.

### Schema-Per-Tenant Multitenancy

Each tenant gets a dedicated PostgreSQL schema (`tenant_<uuid>`), provisioned and migrated automatically on first request. A `sync.Map` cache ensures migrations only run once per process lifetime, not on every request. This gives true data isolation at the database level, not just at the application level.

### Secure Authentication

- The JWT is stored in an **HttpOnly cookie** — it cannot be read by JavaScript, which blocks XSS-based token theft.
- Passwords are hashed with **bcrypt**. The hash is never exposed in any API response (`json:"-"`).
- The `PublicTenant` DTO is a separate struct that contains only safe fields, used wherever tenant data is serialized to JSON.
- Soft-delete reactivation correctly re-hashes the password before restoring the account.

### Safe Storefront DB Isolation

The public storefront handler opens a dedicated database connection pinned to the tenant schema and defers a `closer()` call tied to the request lifecycle. This prevents `search_path` from one tenant bleeding into another connection in the pool.

### DRY Request Handling

`helpers.ParseBody` combines body decoding and struct validation (`go-playground/validator`) into a single call used consistently across all handlers. Route parameter parsing and user ID extraction follow the same helper pattern.

### Data Integrity

- **Soft deletes** on all major entities — records are never permanently destroyed by default.
- **UUID primary keys** generated by PostgreSQL (`gen_random_uuid()`).
- **DB-level `CHECK` constraints** enforce valid enum values (`plan`, `status`, `theme_mode`) directly in the schema, not only in application code.
