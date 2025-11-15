# 🏪 SuperShop - Multi-Tenant Shop Management System

A complete, production-ready shop management system designed for multi-tenant architecture. Built with modern technologies for scalability, performance, and ease of deployment.

## 📋 Overview

SuperShop provides a comprehensive solution for managing multiple shop branches or independent businesses within a single platform. Each tenant (shop) has complete data isolation while sharing the same application infrastructure.

### **Key Features**

✅ **Multi-Tenant Architecture** - Complete data isolation per store  
✅ **Inventory Management** - Real-time stock tracking with expiry monitoring  
✅ **POS System** - Fast, reliable point-of-sale transactions  
✅ **Sales Analytics** - Dashboard with revenue, profit, and forecasting  
✅ **Role-Based Access** - SUPER_ADMIN, OWNER, EMPLOYEE permissions  
✅ **JWT Authentication** - Secure auth with refresh tokens  
✅ **RESTful API** - Well-documented with Swagger/OpenAPI  
✅ **Responsive Dashboard** - Modern UI built with Next.js & Tailwind  
✅ **Docker Ready** - Easy deployment with containerization  

## 🛠️ **Technology Stack**

### Backend (API Server)

- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL 15 with Prisma ORM
- **Authentication**: JWT with Passport
- **Caching**: Redis 7
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **Deployment**: Docker + DigitalOcean

### Frontend (Admin Dashboard)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query (TanStack Query)
- **HTTP**: Axios
- **Deployment**: Vercel

## 📦 **Project Structure**

```bash
supershop/
├── backend/                    # NestJS Backend API
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── common/            # Shared modules (Prisma, guards, etc.)
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & JWT
│   │   │   ├── users/         # User management
│   │   │   ├── tenants/       # Store/tenant management
│   │   │   ├── catalog/       # Product catalog (shared)
│   │   │   ├── inventory/     # Inventory (per tenant)
│   │   │   └── sales/         # Sales & POS
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── frontend/                   # Next.js Frontend
    ├── src/
    │   ├── app/               # App router pages
    │   ├── components/        # React components
    │   ├── lib/              # API client, utilities
    │   └── types/            # TypeScript types
    ├── package.json
    └── next.config.js
```

## 🚀 **Getting Started**

### **Prerequisites**

- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 14+
- **Redis** 7+ (optional but recommended)
- **Docker** & Docker Compose (for containerized setup)

### **Backend Setup**

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

**Backend runs at:** `http://localhost:8000`  
**API Docs (Swagger):** `http://localhost:8000/api/docs`

### **Frontend Setup**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL if needed

# Start development server
npm run dev
```

**Frontend runs at:** `http://localhost:3000`

### **Docker Setup (All-in-One)**

```bash
cd backend
docker-compose up -d
```

This starts:

- PostgreSQL database
- Redis cache
- NestJS backend API

## 📖 **API Documentation**

### **Base URL**

- Development: `http://localhost:8000/api/v1`
- Production: `https://your-domain.com/api/v1`

### **Authentication Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login & get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |

### **Tenant Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tenants` | List all tenants | SUPER_ADMIN |
| GET | `/tenants/me` | Get my tenant | OWNER/EMPLOYEE |
| POST | `/tenants/setup` | Setup first store | OWNER |
| GET | `/tenants/stats` | Tenant statistics | OWNER |
| GET | `/tenants/metrics/dashboard` | Dashboard metrics | OWNER |

### **Inventory Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory` | List inventory | OWNER/EMPLOYEE |
| POST | `/inventory` | Add item | OWNER/EMPLOYEE |
| PUT | `/inventory/:id` | Update item | OWNER/EMPLOYEE |
| DELETE | `/inventory/:id` | Delete item | OWNER/EMPLOYEE |
| GET | `/inventory/alerts/low-stock` | Low stock alerts | OWNER/EMPLOYEE |
| GET | `/inventory/alerts/expiring` | Expiring items | OWNER/EMPLOYEE |

### **Sales Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/sales` | Create sale (POS) | OWNER/EMPLOYEE |
| GET | `/sales` | List all sales | OWNER/EMPLOYEE |
| GET | `/sales/:id` | Get sale details | OWNER/EMPLOYEE |
| GET | `/sales/summary/today` | Today's summary | OWNER/EMPLOYEE |

**Full API documentation with request/response examples available at `/api/docs`**

## 🔐 **Authentication Flow**

```bash
1. Register → POST /auth/register
   ↓
2. Login → POST /auth/login (returns accessToken + refreshToken)
   ↓
3. Store tokens in localStorage
   ↓
4. Make authenticated requests with:
   Header: Authorization: Bearer <accessToken>
   ↓
5. When accessToken expires → POST /auth/refresh
   ↓
6. Logout → POST /auth/logout
```

## 👥 **User Roles**

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | Full system access, manage all tenants |
| **OWNER** | Manage own store, view reports, manage inventory & sales |
| **EMPLOYEE** | Add sales, view inventory, limited permissions |

## 💾 **Database Schema**

### **Core Tables**

- `users` - User accounts
- `tenants` - Store/business information
- `refresh_tokens` - JWT refresh tokens

### **Catalog (Shared across tenants)**

- `products` - Master product list
- `product_variants` - SKUs (sellable units)
- `categories` - Product categories
- `brands` - Product brands
- `suppliers` - Supplier information

### **Per-Tenant Data**

- `inventory_items` - Stock levels
- `sales` - Transaction records
- `sale_items` - Line items
- `restock_receipts` - Batch inventory logs

## 🌍 **Deployment**

### **Frontend (Vercel) - Recommended**

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
4. Deploy (automatic on every push to `main`)

**Zero configuration required!**

### **Backend (DigitalOcean Droplet)**

1. **Create Droplet** (Ubuntu 22.04, 2GB RAM minimum)
2. **Install Docker & Docker Compose**
3. **Clone repository**
4. **Setup managed PostgreSQL** (same region as Droplet)
5. **Setup managed Redis** (same region)
6. **Configure `.env.production`**
7. **Run:** `docker-compose -f docker-compose.prod.yml up -d`
8. **Setup nginx** reverse proxy with SSL (Let's Encrypt)

### **Environment Variables (Production)**

```env
# Backend
DATABASE_URL=postgresql://user:pass@managed-db:5432/supershop
REDIS_HOST=managed-redis-host
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<another-strong-secret>
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

## 📊 **Performance Tips**

- **Use Redis caching** for dashboard metrics
- **Deploy in same region** (DB + Redis + API server)
- **Enable CDN** for frontend (Vercel does this automatically)
- **Use connection pooling** for database
- **Implement pagination** for large datasets

## 🧪 **Testing**

```bash
# Backend tests
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report

# Frontend tests
cd frontend
npm run test
```

## 📝 **License**

MIT License - feel free to use for personal or commercial projects.

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 💬 **Support**

- **Issues**: Open an issue on GitHub
- **Email**: <support@supershop.com>
- **Documentation**: `/api/docs` for API reference

## 🎯 **Roadmap**

- [ ] Mobile app (React Native)
- [ ] Advanced analytics & forecasting
- [ ] Multi-currency support
- [ ] Barcode scanner integration
- [ ] Email notifications
- [ ] Export reports (PDF/Excel)
- [ ] Customer loyalty program
- [ ] Online storefront per tenant

---

**Built with ❤️ for local shop owners**

**Author**: Ishtiaqe  
**Repository**: [github.com/Ishtiaqe/supershop](https://github.com/Ishtiaqe/supershop)
