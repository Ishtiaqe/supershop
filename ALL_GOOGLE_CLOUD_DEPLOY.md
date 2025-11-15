# 🎯 Complete Google Cloud Deployment (No Redis, With Firebase)

**Optimized for cost and simplicity!**

## Final Architecture

```
Google Cloud Platform
├── Cloud SQL (PostgreSQL) - $7/month
├── Cloud Run (NestJS API) - $0-5/month (free tier)
└── Firebase Hosting (Next.js) - $0-2/month (free tier)

Total: ~$7-15/month
NO REDIS NEEDED!
```

---

## Prerequisites

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Install Firebase CLI
npm install -g firebase-tools

# Login
gcloud auth login
firebase login
```

---

## Part 1: Deploy Backend to Cloud Run

### Step 1: Setup Cloud SQL (PostgreSQL)

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Create PostgreSQL instance
gcloud sql instances create supershop-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-southeast1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --storage-size=10GB \
  --backup

# Create database
gcloud sql databases create supershop --instance=supershop-db

# Get connection name (save this!)
gcloud sql instances describe supershop-db \
  --format="value(connectionName)"
# Output: PROJECT_ID:REGION:supershop-db
```

### Step 2: Prepare Backend (Remove Redis)

Update `backend/.env.production`:
```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres:PASSWORD@/supershop?host=/cloudsql/PROJECT:REGION:supershop-db
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://YOUR-APP.web.app
```

**Remove Redis from `backend/src/app.module.ts`:**
```typescript
// Comment out or remove Redis/Cache imports
// import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // CacheModule.register(), // Remove this
    PrismaModule,
    AuthModule,
    // ... other modules
  ],
})
export class AppModule {}
```

Update `backend/src/main.ts` for Cloud Run (port 8080):
```typescript
const port = process.env.PORT || 8080;
await app.listen(port);
console.log(`🚀 Running on port ${port}`);
```

### Step 3: Build & Deploy Backend

```bash
cd backend

# Build Docker image and submit to Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/supershop-backend

# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy supershop-api \
  --image gcr.io/YOUR_PROJECT_ID/supershop-backend \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:REGION:supershop-db \
  --set-env-vars NODE_ENV=production,PORT=8080,JWT_SECRET=your-secret,JWT_REFRESH_SECRET=your-refresh-secret,CORS_ORIGIN=https://YOUR-APP.web.app \
  --set-env-vars DATABASE_URL="postgresql://postgres:PASSWORD@/supershop?host=/cloudsql/PROJECT:REGION:supershop-db" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

# Get your API URL
gcloud run services describe supershop-api \
  --region asia-southeast1 \
  --format="value(status.url)"
# Example: https://supershop-api-xxxxx-uc.a.run.app
```

### Step 4: Run Database Migrations

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start proxy in background
./cloud-sql-proxy PROJECT_ID:REGION:supershop-db &

# Run migrations (in another terminal)
cd backend
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/supershop" \
npm run prisma:migrate deploy

# Stop proxy
kill %1
```

**Your backend is live!** 🎉
URL: `https://supershop-api-xxxxx-uc.a.run.app`

---

## Part 2: Deploy Frontend to Firebase Hosting

### Step 1: Setup Frontend for Firebase

```bash
cd frontend

# Initialize Firebase
firebase init hosting

# Choose:
# - Use existing project or create new
# - Public directory: out
# - Single-page app: Yes
# - GitHub deploys: No (optional)
```

Update `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://supershop-api-xxxxx-uc.a.run.app/api/v1
NEXT_PUBLIC_APP_NAME=SuperShop
```

### Step 2: Add Frontend Caching (Replace Redis)

Update `frontend/src/lib/api.ts` to use browser caching:

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Simple cache helper
const cache = {
  get: (key: string, maxAge: number = 5 * 60 * 1000) => {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < maxAge) {
        return data;
      }
      localStorage.removeItem(key);
    }
    return null;
  },
  
  set: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  },
  
  clear: (key: string) => {
    localStorage.removeItem(key);
  }
};

export { cache };
```

Use in React Query:
```typescript
// In your frontend components
import { useQuery } from '@tanstack/react-query';
import api, { cache } from '@/lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/tenants/metrics/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### Step 3: Build & Deploy Frontend

```bash
cd frontend

# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Your frontend is live!
# URL: https://YOUR-PROJECT.web.app
# or: https://YOUR-PROJECT.firebaseapp.com
```

### Step 4: Update Backend CORS

Now that you have your Firebase URL, update backend CORS:

```bash
gcloud run services update supershop-api \
  --region asia-southeast1 \
  --set-env-vars CORS_ORIGIN=https://YOUR-PROJECT.web.app
```

---

## Part 3: Custom Domain (Optional)

### For Firebase Hosting

```bash
# Add custom domain in Firebase Console
# Or via CLI:
firebase hosting:channel:deploy live --expires 30d

# Follow instructions to:
# 1. Add domain in Firebase Console
# 2. Update DNS records (A/CNAME)
# 3. SSL auto-provisioned
```

### For Cloud Run API

```bash
# Map custom domain to Cloud Run
gcloud beta run domain-mappings create \
  --service supershop-api \
  --domain api.yourdomain.com \
  --region asia-southeast1

# Update DNS with provided records
```

---

## Cost Breakdown (All Google Cloud)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Cloud SQL PostgreSQL | db-f1-micro | $7-10 |
| Cloud Run (Backend) | Free tier | $0 |
| Cloud Run (Backend) | After free tier | $0-5 |
| Firebase Hosting | Free tier | $0 |
| Firebase Hosting | After free tier | $0-2 |
| **Total (Typical)** | | **$7-15** |
| **Total (Free tier)** | | **$7** |

**NO Redis = Save $35/month!**

---

## Deployment Commands Summary

### Initial Setup (One-time)
```bash
# 1. Create Cloud SQL
gcloud sql instances create supershop-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=asia-southeast1

# 2. Deploy Backend
cd backend
gcloud builds submit --tag gcr.io/PROJECT/supershop-backend
gcloud run deploy supershop-api --image gcr.io/PROJECT/supershop-backend --add-cloudsql-instances PROJECT:REGION:supershop-db

# 3. Run Migrations
./cloud-sql-proxy PROJECT:REGION:supershop-db &
npm run prisma:migrate deploy

# 4. Deploy Frontend
cd frontend
firebase deploy --only hosting
```

### Updates (Ongoing)
```bash
# Update Backend
cd backend
gcloud builds submit --tag gcr.io/PROJECT/supershop-backend
gcloud run deploy supershop-api --image gcr.io/PROJECT/supershop-backend

# Update Frontend
cd frontend
npm run build
firebase deploy --only hosting
```

---

## Caching Strategy (No Redis)

### Backend (Minimal)
- Let Cloud Run handle auto-scaling
- PostgreSQL query optimization
- Use Prisma query caching (built-in)

### Frontend (Main caching)
- **React Query:** 5-minute stale time for dashboard data
- **localStorage:** User preferences, recent data
- **sessionStorage:** Temporary cart/session data

Example:
```typescript
// Cache dashboard for 5 minutes
const { data } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboard,
  staleTime: 5 * 60 * 1000,
});
```

---

## Monitoring & Logs

### Cloud Run Logs
```bash
gcloud run services logs read supershop-api --region=asia-southeast1 --limit=50
```

### Cloud SQL Logs
```bash
gcloud sql operations list --instance=supershop-db
```

### Firebase Hosting Stats
```bash
firebase hosting:channel:list
```

---

## CI/CD with Cloud Build (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and Deploy Backend
        run: |
          cd backend
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/supershop-backend
          gcloud run deploy supershop-api --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/supershop-backend --region asia-southeast1
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Deploy to Firebase
        run: |
          cd frontend
          npm ci
          npm run build
          npx firebase-tools deploy --only hosting --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## Security Checklist

- [x] Use strong PostgreSQL password
- [x] Enable Cloud SQL SSL
- [x] Set strong JWT secrets
- [x] Configure CORS properly
- [x] Enable Cloud SQL backups
- [x] Use environment variables (no hardcoded secrets)
- [x] Enable Cloud Run authentication (if needed)
- [x] Set up Cloud Armor for DDoS (optional)

---

## Troubleshooting

**Issue:** Frontend can't connect to backend
```bash
# Check CORS is set correctly
gcloud run services describe supershop-api --region=asia-southeast1 --format="value(spec.template.spec.containers[0].env)"

# Update CORS
gcloud run services update supershop-api --set-env-vars CORS_ORIGIN=https://your-app.web.app
```

**Issue:** Database connection fails
```bash
# Verify Cloud SQL connection name
gcloud sql instances describe supershop-db --format="value(connectionName)"

# Check Cloud Run has --add-cloudsql-instances flag
gcloud run services describe supershop-api --region=asia-southeast1
```

**Issue:** Firebase build fails
```bash
# Ensure Next.js exports properly
cd frontend
npm run build

# Check firebase.json config
cat firebase.json
```

---

## Next Steps

1. ✅ Set up custom domain
2. ✅ Configure automated backups
3. ✅ Set up monitoring alerts
4. ✅ Enable Cloud CDN (optional)
5. ✅ Add error tracking (Sentry)

---

**Total Setup Time:** ~45 minutes  
**Monthly Cost:** $7-15  
**Maintenance:** Minimal  

**All on Google Cloud! 🚀**
