# ⚡ Quick Start Guide

Get ShopSys running in 5 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use Docker)

## 1. Clone & Install

```bash
git clone https://github.com/Ishtiaqe/supershop.git
cd supershop
```

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and set DATABASE_URL

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start backend
npm run start:dev
```

✅ Backend running at: <http://localhost:8000>  
📚 API Docs at: <http://localhost:8000/api/docs>

## 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start frontend
npm run dev
```

✅ Frontend running at: <http://localhost:3000>

## 4. First Steps

1. **Register** as OWNER at <http://localhost:3000/register>
2. **Login** with your credentials
3. **Setup your store** (POST /tenants/setup)
4. Start managing inventory and sales!

## Using Docker (Easiest)

```bash
cd backend
docker-compose up -d
```

This starts everything: PostgreSQL, Redis, and Backend API.

Then run frontend separately:

```bash
cd frontend
npm install
npm run dev
```

## Default Users (After Seeding)

If you run `npm run prisma:seed`:

**Super Admin**

- Email: <admin@supershop.com>
- Password: Admin123!

**Store Owner**

- Email: <owner@shop1.com>
- Password: Owner123!

## Need Help?

- Check [SETUP.md](./SETUP.md) for detailed setup
- Check [README.md](./README.md) for full documentation
- Visit API docs at `/api/docs`

---

**You're ready to go! 🚀**
