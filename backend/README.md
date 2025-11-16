# SuperShop - Multi-tenant Shop Management System

A comprehensive, production-ready shop management system with multi-tenant architecture built with **NestJS** (backend) and **Next.js** (frontend).

## 🏗️ **Architecture**

### **Backend Stack**

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Caching**: Redis (optional; not required for POS typeahead — the frontend uses sessionStorage for short-term caching)
- **Documentation**: Swagger/OpenAPI
- **Deployment**: DigitalOcean Droplet / Managed services (Docker is deprecated in this repo)

### **Frontend Stack**

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query
- **Deployment**: Vercel

### **Multi-Tenant Model**

- **Schema-per-tenant** isolation for data security
- **Role-based access control** (SUPER_ADMIN, OWNER, EMPLOYEE)
- Each store operates independently with complete data separation

## 📁 **Project Structure**

```
supershop/
├── backend/                    # NestJS API Server
│   ├── src/
│   │   ├── common/            # Shared utilities, guards, interceptors
│   │   │   └── prisma/        # Database service
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & authorization
│   │   │   ├── users/         # User management
│   │   │   ├── tenants/       # Store/business management
│   │   │   ├── catalog/       # Product catalog (shared)
│   │   │   ├── inventory/     # Stock management (per tenant)
│   │   │   └── sales/         # POS & sales transactions
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile included for container builds when deploying to Cloud Run / local Docker workflows
│
└── frontend/                   # Next.js Dashboard
    ├── src/
    │   ├── app/               # App router pages
    │   ├── components/        # React components
    │   ├── lib/              # Utilities, API client
    │   └── types/            # TypeScript types
    ├── package.json
    └── next.config.js
```

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 7+ (optional but recommended)
- Docker & Docker Compose (for deployment)

### **Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/supershop"

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:8080/api/v1`
API documentation at `http://localhost:8080/api/docs`

### **Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## 📊 **Database Schema**

### **Core Entities**

- **Users**: Multi-role user system (SUPER_ADMIN, OWNER, EMPLOYEE)
- **Tenants**: Individual stores/businesses
- **RefreshTokens**: JWT refresh token storage

### **Catalog (Shared)**

- **Products**: Master product list
- **ProductVariants**: SKUs with pricing
- **Categories**: Product categorization
- **Brands**: Product brands
- **Suppliers**: Supplier information

### **Per-Tenant Data**

- **InventoryItems**: Stock levels, pricing, expiry tracking
- **Sales**: Transaction records
- **SaleItems**: Line items per sale
- **RestockReceipts**: Batch inventory additions

## 🔐 **Authentication Flow**

1. **Register** → `POST /api/v1/auth/register`
2. **Login** → `POST /api/v1/auth/login` (returns access + refresh tokens)
3. **Protected Requests** → Include `Authorization: Bearer <access_token>`
4. **Refresh Token** → `POST /api/v1/auth/refresh` when access token expires
5. **Logout** → `POST /api/v1/auth/logout`

### **Rate Limiting**

- Registration: 5 req/min
- Login: 5 req/min
- Refresh: 10 req/min

## 🏪 **Tenant Setup (Shop Owner Flow)**

1. User registers as `OWNER` without `tenantId`
2. After login, call `POST /api/v1/tenants/setup` to create first store
3. User's `tenantId` is automatically linked
4. Owner can now manage inventory, sales, and employees

## 📈 **Key Features**

### **Inventory Management**

- Real-time stock tracking
- Low stock alerts
- Expiry date monitoring
- Batch restock operations
- Ad-hoc item support (non-catalog products)

### **Sales & POS**

- Quick sale entry with multiple items
- Multiple payment methods (Cash, Card, Mobile, Other)
- Receipt generation
- Discount support (percentage/fixed)
- Real-time profit calculation

### **Analytics & Reports**

- Dashboard metrics (revenue, profit, sales count)
- Profit & loss statements
- Sales forecasting
- Top-selling products
- Inventory valuation

### **Multi-Tenant Security**

- Complete data isolation per store
- Role-based permissions
- Tenant-scoped queries (automatic filtering)
- JWT authentication with refresh tokens

## 🛠️ **Available Scripts**

### Backend

```bash
npm run start:dev      # Development mode with hot reload
npm run build          # Production build
npm run start:prod     # Start production server
npm run prisma:studio  # Open Prisma Studio (DB GUI)
npm run test           # Run tests
npm run lint           # Lint code
```

### Frontend

```bash
npm run dev           # Development server

## Deployment


### **Frontend (Vercel)**


### **Backend (DigitalOcean)**

-- `GET /inventory` - List inventory items. Optional query param `q` will filter items by inventory name, SKU, variant name or product name (useful for POS typeahead/search). When `q` is present, results are capped with `take: 20` for performance. The frontend caches recently searched queries in `sessionStorage` for small bursts of repeated queries; server-side Redis caching is optional but not required.
8. Set up nginx reverse proxy with SSL (Let's Encrypt)

### **Database (DigitalOcean Managed PostgreSQL)**
## 📝 **API Documentation**

Full API reference available at: `/api/docs` (Swagger UI)

### **Core Endpoints**

#### **Authentication**

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

#### **Tenants**

- `GET /tenants` - List all tenants (SUPER_ADMIN)
- `GET /tenants/me` - Get current user's tenant
- `GET /tenants/stats` - Get tenant statistics
- `GET /tenants/metrics/dashboard` - Dashboard metrics
- `POST /tenants/setup` - Setup first store (OWNER)
### Create tenant (Super Admin)

Super-admins can create tenants on behalf of owners with the `POST /tenants` endpoint.

Example curl (SUPER_ADMIN token required):

```bash
curl -X POST https://api.shomaj.one/api/v1/tenants \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"name":"Tenant Name","ownerId":"OWNER_USER_UUID"}'
```

The owner must be an existing user without a tenant assigned. After this call the owner will be linked to the new tenant.

Create tenant (Owner self-setup): Owners should use the frontend link `https://shop.shomaj.one/tenant/setup` after logging in to set up their store; this calls `POST /tenants/setup`.

- `PATCH /tenants/:id` - Update tenant

#### **Catalog**

- `GET /catalog/search` - Search products/SKUs
- `GET /catalog/products` - List products
- `POST /catalog/products` - Create product
- `GET /catalog/categories` - List categories
- `GET /catalog/brands` - List brands

#### **Inventory**

-- `GET /inventory` - List inventory items. Optional query param `q` will filter items by inventory name, SKU, variant name or product name (useful for POS typeahead/search). When `q` is present, results are capped with `take: 20` for performance and cached in Redis using key `inventory-search:<tenantId>:<q>` with TTL given by env `REDIS_TTL` (default 60s).
- `POST /inventory` - Add inventory item
- `POST /inventory/batch/restock` - Batch restock
- `GET /inventory/alerts/low-stock` - Low stock alerts
- `GET /inventory/alerts/expiring` - Expiring items
- `PUT /inventory/:id` - Update item
- `DELETE /inventory/:id` - Delete item

#### **Sales**

- `POST /sales` - Create sale (POS transaction)
- `GET /sales` - List sales
- `GET /sales/summary/today` - Today's sales summary
- `GET /sales/:id` - Get sale details
- `GET /sales/:id/receipt` - Get printable receipt

## 🔒 **Security Best Practices**

- All passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens with short expiry (15 minutes)
- Refresh tokens stored in database
- CORS enabled for frontend domain only
- Input validation with class-validator
- SQL injection prevention via Prisma ORM
- Rate limiting on auth endpoints

## 🧪 **Testing**

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 **Dependencies**

### Backend Core

- `@nestjs/core`, `@nestjs/common` - Framework
- `@prisma/client`, `prisma` - ORM
- `@nestjs/jwt`, `passport-jwt` - Auth
- `bcrypt` - Password hashing
- `class-validator`, `class-transformer` - Validation
- `redis`, `cache-manager` - Caching

### Frontend Core

- `next` - Framework
- `react`, `react-dom` - UI
- `@tanstack/react-query` - Data fetching
- `axios` - HTTP client
- `tailwindcss` - Styling
- `shadcn/ui` - Component library

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License.

## 👨‍💻 **Author**

**Ishtiaqe**

## 🆘 **Support**

For support, email <support@supershop.com> or open an issue.

---

**Built with ❤️ for local shop owners**
