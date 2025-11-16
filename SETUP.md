# 🚀 SuperShop Setup & Deployment Guide

Complete guide to set up and deploy the SuperShop multi-tenant shop management system.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Application](#running-the-application)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download)) - Optional but recommended
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/)) - For containerized setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ishtiaqe/supershop.git
cd supershop
```

---

## Database Setup

### Option 1: Local PostgreSQL

1. **Install PostgreSQL** if not already installed

2. **Create Database**:

```bash
psql -U postgres
CREATE DATABASE supershop;
\q
```

3. **Configure Connection**:
   Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/supershop?schema=public"
```

### Option 2: Docker PostgreSQL (Deprecated)

This repository no longer uses Docker for local development by default. If you need a containerized database,
start a PostgreSQL instance manually with Docker or your preferred method — the recommended development
flow is to run Postgres locally or use the Cloud SQL Proxy as documented in `backend/LOCAL_DB_SETUP.md`.

---

## Environment Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Application
NODE_ENV=development
PORT=8000
API_VERSION=v1
API_PREFIX=api

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/supershop?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# CORS
CORS_ORIGIN=http://localhost:3000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Generate Strong Secrets**:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=SuperShop
```

---

## Running the Application

### Backend Setup & Run

````bash
cd backend

# Install dependencies
npm install
### Seed default users (optional)

After the database is running and `prisma:generate`/`prisma:migrate` have completed, seed the example users:

```bash
cd backend
npm run prisma:seed
````

This creates two accounts by default:

- Super Admin: <admin@supershop.com> / Admin123!
- Store Owner: <owner@shop1.com> / Owner123!

You can then test authentication with the Login endpoint.

### Test Login (curl)

Register a new user:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
   -H 'Content-Type: application/json' \
   -d '{"email":"new@user.com","password":"Secret123!","fullName":"New User","role":"OWNER"}'
```

Login and get tokens:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
   -H 'Content-Type: application/json' \
   -d '{"email":"admin@supershop.com","password":"Admin123!"}'
```

If login is successful you will receive an accessToken and refreshToken. Use the access token in Authorization headers:

```bash
curl -H "Authorization: Bearer <accessToken>" http://localhost:8000/api/v1/tenants/me
```

# Generate Prisma client

npm run prisma:generate

# Run database migrations

npm run prisma:migrate

# (Optional) Seed database with sample data

npm run prisma:seed

# Start development server

npm run start:dev

````

**Backend will run at**: `http://localhost:8000`
**API Documentation**: `http://localhost:8000/api/docs`

### Frontend Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
````

**Frontend will run at**: `http://localhost:3000`

### Using Docker Compose (All Services)

```bash
cd backend
docker-compose up -d
```

This starts:

- PostgreSQL (port 5432)
- Redis (port 6379)
- NestJS Backend (port 8000)

---

## Production Deployment

### 1. Frontend Deployment (Vercel)

**Recommended**: Vercel is the easiest way to deploy Next.js apps.

#### Steps

1. **Push to GitHub**:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import in Vercel**:

   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**:

   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api/v1`
   - `NEXT_PUBLIC_APP_NAME` = `SuperShop`

4. **Deploy**:
   - Vercel auto-deploys on every push to `main`
   - Get your production URL (e.g., `https://supershop.vercel.app`)

**Custom Domain** (Optional):

- Add custom domain in Vercel settings
- Update DNS records as instructed

---

### 2. Backend Deployment (DigitalOcean)

#### 2.1 Create Managed Database

1. **Create PostgreSQL Database**:

   - Go to DigitalOcean Dashboard
   - Create → Databases → PostgreSQL 15
   - **Region**: Choose closest to users (e.g., SGP1 for Singapore)
   - **Plan**: Basic ($15/month minimum)
   - Note the connection string

2. **Create Redis Instance** (Optional but recommended):
   - Create → Databases → Redis 7
   - **Same region** as PostgreSQL
   - Note the connection details

#### 2.2 Create Droplet (VPS)

1. **Create Droplet**:

   - Image: Ubuntu 22.04 LTS
   - Plan: Basic ($12/month - 2GB RAM minimum)
   - **Same region** as database
   - Add SSH key

2. **Connect to Droplet**:

```bash
ssh root@your_droplet_ip
```

3. **Install Docker & Docker Compose**:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

#### 2.3 Deploy Backend

1. **Clone Repository**:

```bash
git clone https://github.com/Ishtiaqe/supershop.git
cd supershop/backend
```

2. **Create Production Environment File**:

```bash
nano .env.production
```

Add:

```env
NODE_ENV=production
PORT=8000
DATABASE_URL="postgresql://user:pass@managed-db-host:25060/supershop?sslmode=require"
REDIS_HOST=managed-redis-host
REDIS_PORT=25061
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
CORS_ORIGIN=https://supershop.vercel.app
```

3. **Build & Run with Docker**:

```bash
# Build image
docker build -t supershop-backend .

# Run migrations
docker run --rm --env-file .env.production supershop-backend npx prisma migrate deploy

# Start application
docker run -d \
  --name supershop-backend \
  -p 8000:8000 \
  --env-file .env.production \
  --restart unless-stopped \
  supershop-backend
```

4. **Verify Backend is Running**:

```bash
curl http://localhost:8000/api/v1/health
```

#### 2.4 Setup Nginx Reverse Proxy with SSL

1. **Install Nginx**:

```bash
apt install nginx -y
```

2. **Configure Nginx**:

```bash
nano /etc/nginx/sites-available/supershop
```

Add:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Enable Site**:

```bash
ln -s /etc/nginx/sites-available/supershop /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

4. **Install SSL with Let's Encrypt**:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.yourdomain.com
```

5. **Update Frontend CORS Origin**:
   Update `CORS_ORIGIN` in `.env.production` to your Vercel domain.

---

## Troubleshooting

### Backend Issues

**Problem**: Database connection fails

```
Solution:
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall allows connection
```

**Problem**: Prisma migrations fail

```bash
Solution:
# Reset database (CAUTION: Deletes all data)
npm run prisma:migrate reset

# Or deploy specific migration
npx prisma migrate deploy
```

**Problem**: Port 8000 already in use

```bash
Solution:
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Frontend Issues

**Problem**: API calls fail with CORS error

```
Solution:
- Check NEXT_PUBLIC_API_URL is correct
- Ensure backend CORS_ORIGIN matches frontend URL
```

**Problem**: Build fails

```bash
Solution:
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Docker Issues

**Problem**: Container fails to start

```bash
# Check logs
docker logs supershop-backend

# Restart container
docker restart supershop-backend
```

**Problem**: Out of memory

```bash
Solution:
- Increase Droplet size
- Add swap space
```

---

## Post-Deployment Checklist

- [ ] Backend API is accessible at `https://api.yourdomain.com`
- [ ] Frontend is accessible at `https://supershop.vercel.app`
- [ ] Database backups are configured (DigitalOcean auto-backup)
- [ ] SSL certificates are active
- [ ] Environment variables are secure (no defaults)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Monitoring is set up (optional: Sentry, LogRocket)

---

## Monitoring & Maintenance

### Database Backups

DigitalOcean Managed Databases include **daily automated backups**.

Manual backup:

```bash
pg_dump -h managed-db-host -U user -d supershop > backup.sql
```

### Application Logs

View Docker logs:

```bash
docker logs -f supershop-backend
```

### Updating Application

```bash
cd supershop/backend
git pull origin main
docker build -t supershop-backend .
docker stop supershop-backend
docker rm supershop-backend
docker run -d --name supershop-backend -p 8000:8000 --env-file .env.production supershop-backend
```

---

## Support

- **Documentation**: [README.md](../README.md)
- **API Docs**: `/api/docs`
- **Issues**: GitHub Issues
- **Email**: <support@supershop.com>

---

**Happy Deploying! 🚀**
