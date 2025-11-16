# 🚀 Google Cloud Deployment Guide

Complete guide to deploy SuperShop on Google Cloud Platform.

## Architecture Overview

```
┌──────────────────────────────────────────┐
│        Google Cloud Platform             │
├──────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │   Cloud SQL (PostgreSQL)        │    │
│  │   - Managed Database            │    │
│  │   - Auto Backups                │    │
│  └─────────────────────────────────┘    │
│                 ↓                        │
│  ┌─────────────────────────────────┐    │
│  │   Cloud Run (Backend API)       │    │
│  │   - Serverless Containers       │    │
│  │   - Auto-scaling                │    │
│  └─────────────────────────────────┘    │
│                 ↓                        │
│  ┌─────────────────────────────────┐    │
│  │   Memorystore (Redis)           │    │
│  │   - Optional Caching            │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘
                 ↓ API Calls
┌──────────────────────────────────────────┐
│             Vercel                       │
├──────────────────────────────────────────┤
│   Next.js Frontend Dashboard             │
│   - Global CDN                           │
│   - Auto Deploy from GitHub              │
└──────────────────────────────────────────┘
```

---

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Docker installed locally
- Git repository (GitHub/GitLab)

---

## Step 1: Setup Google Cloud SQL (PostgreSQL)

### 1.1 Create PostgreSQL Instance

```bash
# Login to gcloud
gcloud auth login

# Set your project
gcloud config set project shomaj-817b0

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create supershop-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-southeast1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup \
  --backup-start-time=03:00
```

**Production tier recommendations:**
- Development: `db-f1-micro` (shared CPU, $7/month)
- Production: `db-n1-standard-1` (1 vCPU, 3.75GB RAM, $50/month)

### 1.2 Create Database

```bash
# Create the database
gcloud sql databases create supershop \
  --instance=supershop-db

# Create a user (optional, can use root)
gcloud sql users create supershop_user \
  --instance=supershop-db \
  --password=YOUR_USER_PASSWORD
```

### 1.3 Get Connection Details

```bash
# Get connection name
gcloud sql instances describe supershop-db --format="value(connectionName)"
# Output: shomaj-817b0:asia-southeast1:supershop-db

# Get public IP
gcloud sql instances describe supershop-db --format="value(ipAddresses[0].ipAddress)"
```

### 1.4 Enable Cloud SQL Admin API

```bash
gcloud services enable sqladmin.googleapis.com
```

---

## Step 2: Deploy Backend to Google Cloud Run

### 2.1 Prepare Your Backend

```bash
cd backend

# Build Docker image
docker build -t gcr.io/shomaj-817b0/supershop-backend:latest .

# Test locally (optional)
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@HOST:5432/supershop" \
  gcr.io/shomaj-817b0/supershop-backend:latest
```

### 2.2 Push to Google Container Registry

```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Push image
docker push gcr.io/shomaj-817b0/supershop-backend:latest
```

### 2.3 Create Environment Variables File

Create `env.yaml`:

```yaml
DATABASE_URL: "postgresql://supershop_user:PASSWORD@/supershop?host=/cloudsql/shomaj-817b0:asia-southeast1:supershop-db"
JWT_SECRET: "your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET: "your-super-secret-refresh-key-min-32-chars"
JWT_EXPIRES_IN: "15m"
JWT_REFRESH_EXPIRES_IN: "7d"
NODE_ENV: "production"
PORT: "8080"
CORS_ORIGIN: "https://your-frontend.vercel.app"
```

### 2.4 Deploy to Cloud Run

```bash
# Deploy with Cloud SQL connection
gcloud run deploy supershop-backend \
  --image gcr.io/shomaj-817b0/supershop-backend:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --env-vars-file cloudbuild.yaml \
  --add-cloudsql-instances shomaj-817b0:asia-southeast1:supershop-db \
  --port 8080

### 2.4.1 Use Secret Manager for runtime secrets (recommended)

For production, store sensitive data (JWT keys, DB credentials) in Secret Manager and reference them from Cloud Run.

1. Create secrets in Secret Manager:

```bash
echo -n "your_jwt_secret" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "your_refresh_secret" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-
echo -n "postgresql://user:pass@/supershop?host=/cloudsql/shomaj-817b0:asia-southeast1:INSTANCE" | gcloud secrets create DATABASE_URL --data-file=-
```

2. Grant Cloud Run's runtime service account access to secrets (assume default Cloud Run SA or change to the SA you're using):

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
RUNTIME_SA=${PROJECT_NUMBER}-compute@developer.gserviceaccount.com

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding JWT_REFRESH_SECRET \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"

If you already created `DATABASE_URL` earlier and want to update the stored DB URL, add a new secret version instead of trying to re-create the secret. Use:

```bash
echo -n 'postgresql://supershop_user:MUJAHIDrumel123@123@/supershop?host=/cloudsql/shomaj-817b0:asia-southeast1:supershop' | \
  gcloud secrets versions add DATABASE_URL --data-file=-
```

Check the latest stored value (only your authorized account can do this):

```bash
gcloud secrets versions access latest --secret=DATABASE_URL
```
```

3. Deploy Cloud Run referencing these secrets (cloudbuild.yaml includes a skeleton using `--set-secrets`):

```bash
gcloud run deploy supershop-backend \
  --image gcr.io/shomaj-817b0/supershop-backend:$TAG \
  --set-secrets "JWT_SECRET=JWT_SECRET:latest" \
  --set-secrets "JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --add-cloudsql-instances=shomaj-817b0:asia-southeast1:INSTANCE
```

4. Give Cloud Run the Cloud SQL client role (if using Cloud SQL):

```bash
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/cloudsql.client
```

5. Re-run your Cloud Build trigger (or `gcloud builds submit`) with `_JWT_SECRET_SECRET` and `_DATABASE_URL_SECRET` substitutions set to the secret names defined above. This avoids passing the keys in plain text substitutions.

Notes
- Replace `RUNTIME_SA` with a custom service account you prefer and assign it to your Cloud Run service: `--service-account=YOUR_SA@PROJECT.iam.gserviceaccount.com` in the `gcloud run deploy` flags.
- In Cloud Build pipeline, use `--set-secrets` when deploying to Cloud Run so the runtime can access secrets without exposing them inside the build logs.

### 2.4.2 Create a dedicated Cloud Run runtime service account (recommended)

For production it is best to create a dedicated service account and assign only the minimum permissions it needs to run the container.

1. Create the service account that will run your Cloud Run service (this will become `supershop-run-sa` in the example):

```bash
gcloud iam service-accounts create supershop-run-sa --description="Cloud Run SA for SuperShop" --display-name="supershop-run-sa"
```

2. Grant the minimal roles to this service account:

```bash
# Allow the service account to connect to Cloud SQL
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:supershop-run-sa@$(gcloud config get-value project).iam.gserviceaccount.com" --role="roles/cloudsql.client"

# Allow the service account to read Secret Manager secrets
gcloud secrets add-iam-policy-binding DATABASE_URL \ 
  --member="serviceAccount:supershop-run-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding JWT_SECRET \ 
  --member="serviceAccount:supershop-run-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding JWT_REFRESH_SECRET \ 
  --member="serviceAccount:supershop-run-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. When deploying, pass this service account to Cloud Run with `--service-account` (see below). Cloud Build must be allowed to set that service account; if your Cloud Build service account lacks the permission to set `--service-account`, use Cloud Console or the Cloud IAM UI to give the Cloud Build service account the `iam.serviceAccountUser` role on `supershop-run-sa`:

```bash
# Grant the Cloud Build SA the ability to invoke or use the runtime service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

### Grant Cloud Build access to Secret Manager

If you plan to verify secrets from the Cloud Build pipeline (we add a deploy-time check), grant the Cloud Build service account permission to describe or access secrets.

```bash
# Cloud Build SA
CLOUD_BUILD_SA=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')@cloudbuild.gserviceaccount.com

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${CLOUD_BUILD_SA}" --role="roles/secretmanager.secretAccessor"
```
```

4. Finally, deploy with a `--service-account` arg (Cloud Build's `cloudbuild.yaml` can be updated to set the substitution `_CLOUD_RUN_SA=supershop-run-sa@shomaj-817b0.iam.gserviceaccount.com`):

```bash
gcloud run deploy supershop-backend \
  --image gcr.io/shomaj-817b0/supershop-backend:latest \
  --region asia-southeast1 \
  --service-account=supershop-run-sa@shomaj-817b0.iam.gserviceaccount.com \
  --add-cloudsql-instances PROJECT:asia-southeast1:INSTANCE \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" --set-secrets "JWT_SECRET=JWT_SECRET:latest" \
  --set-env-vars PORT=8080
```
```

**Note:** Cloud Run requires port 8080 by default. Update your `main.ts`:

```typescript
const port = process.env.PORT || 8080;
```

### 2.5 Run Database Migrations

```bash
# Get Cloud Run service URL
gcloud run services describe supershop-backend \
  --region asia-southeast1 \
  --format="value(status.url)"

# Run migrations using Cloud Run Jobs (or connect via Cloud SQL Proxy)
# Option 1: Use Cloud Build to run migrations
# Option 2: Run locally via Cloud SQL Proxy (see below)
```

### 2.6 Cloud SQL Proxy (for migrations)

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start proxy
./cloud-sql-proxy --port 5432 shomaj-817b0:asia-southeast1:supershop-db

# In another terminal, run migrations
cd backend
DATABASE_URL="postgresql://supershop_user:PASSWORD@localhost:5432/supershop" \
npm run prisma:migrate deploy
```

---

## Step 3: Setup Redis (Optional - Memorystore)

### 3.1 Create Memorystore Instance

```bash
gcloud redis instances create supershop-redis \
  --size=1 \
  --region=asia-southeast1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

### 3.2 Get Redis Host

```bash
gcloud redis instances describe supershop-redis \
  --region=asia-southeast1 \
  --format="value(host)"
```

### 3.3 Update Cloud Run with Redis

```bash
# Add to env.yaml
REDIS_HOST: "10.x.x.x"  # Redis instance IP
REDIS_PORT: "6379"

# Redeploy
gcloud run deploy supershop-backend \
  --image gcr.io/shomaj-817b0/supershop-backend:latest \
  --set-env-vars-file env.yaml \
  --vpc-connector YOUR_VPC_CONNECTOR  # Required for Memorystore
```

**Note:** Memorystore requires a VPC connector. See [VPC Setup Guide](https://cloud.google.com/run/docs/configuring/vpc-connectors).

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Push to GitHub

```bash
cd frontend
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 4.2 Import in Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select `frontend` as root directory

### 4.3 Configure Environment Variables

In Vercel dashboard:
- `NEXT_PUBLIC_API_URL` = `https://supershop-backend-xxxxx-uc.a.run.app/api/v1`
- `NEXT_PUBLIC_APP_NAME` = `SuperShop`

### 4.4 Deploy

Vercel automatically deploys. Your frontend will be at:
`https://your-project.vercel.app`

---

## Step 5: Configure CORS & Final Setup

### 5.1 Update Backend CORS

Update `env.yaml`:
```yaml
CORS_ORIGIN: "https://your-project.vercel.app"
```

Redeploy:
```bash
gcloud run deploy supershop-backend \
  --set-env-vars-file env.yaml
```

### 5.2 Test Everything

```bash
# Test backend
curl https://supershop-backend-xxxxx-uc.a.run.app/api/v1/health

# Visit frontend
open https://your-project.vercel.app
```

---

## Cost Estimation

### Monthly Costs (Approximate)

| Service | Tier | Cost |
|---------|------|------|
| Cloud SQL (PostgreSQL) | db-f1-micro | $7-10 |
| Cloud SQL (PostgreSQL) | db-n1-standard-1 | $50-60 |
| Cloud Run | 1M requests | $0-5 (free tier) |
| Cloud Run | 10M requests | $20-30 |
| Memorystore (Redis) | 1GB Basic | $35 |
| Vercel | Hobby | $0 |
| Vercel | Pro | $20 |

**Minimal Setup:** ~$7-15/month (Cloud SQL + Cloud Run free tier + Vercel free)
**Production Setup:** ~$100-120/month (All paid tiers)

---

## Security Checklist

- [ ] Use strong passwords for database
- [ ] Enable Cloud SQL SSL connections
- [ ] Set Cloud SQL authorized networks (if not using Cloud Run)
- [ ] Rotate JWT secrets regularly
- [ ] Enable Cloud SQL automatic backups
- [ ] Set up Cloud Armor (DDoS protection)
- [ ] Configure Cloud Run ingress controls
- [ ] Enable Cloud Run authentication (if needed)
- [ ] Set up Secret Manager for sensitive data
- [ ] Configure VPC for private networking

---

## Useful Commands

### Cloud SQL

```bash
# Connect to database
gcloud sql connect supershop-db --user=postgres

# View logs
gcloud sql operations list --instance=supershop-db

# Create backup
gcloud sql backups create --instance=supershop-db

# List backups
gcloud sql backups list --instance=supershop-db
```

### Cloud Run

```bash
# View logs
gcloud run services logs read supershop-backend --region=asia-southeast1

# Update service
gcloud run services update supershop-backend \
  --region=asia-southeast1 \
  --set-env-vars KEY=VALUE

# Delete service
gcloud run services delete supershop-backend --region=asia-southeast1
```

### Container Registry

```bash
# List images
gcloud container images list

# Delete old images
gcloud container images delete gcr.io/shomaj-817b0/supershop-backend:TAG
```

---

## Monitoring & Logging

### Enable Monitoring

```bash
# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# Enable Cloud Logging
gcloud services enable logging.googleapis.com
```

### View Metrics

1. Go to Google Cloud Console
2. Navigate to Cloud Run → supershop-backend
3. Click "Metrics" tab

Monitor:
- Request count
- Request latency
- Error rate
- Container CPU/Memory usage

---

## CI/CD with Cloud Build (Optional)

Create `cloudbuild.yaml` in backend:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/shomaj-817b0/supershop-backend:$COMMIT_SHA', '.']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/shomaj-817b0/supershop-backend:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'supershop-backend'
      - '--image'
      - 'gcr.io/shomaj-817b0/supershop-backend:$COMMIT_SHA'
      - '--region'
      - 'asia-southeast1'
      - '--platform'
      - 'managed'

images:
  - 'gcr.io/shomaj-817b0/supershop-backend:$COMMIT_SHA'
```

The `cloudbuild.yaml` above builds the backend, deploys it to Cloud Run and then can be extended to create/execute a Cloud Run Job (see `backend/cloudbuild.yaml`) which runs `npx prisma migrate deploy` against your database.

Notes:
- The build uses a tag generated by Cloud Build; CI triggers commonly set `SHORT_SHA` or `COMMIT_SHA`. When running `gcloud builds submit` locally those may be empty — to avoid producing an image name ending with a colon we use the always-present `$BUILD_ID` in `backend/cloudbuild.yaml` as a safe default.
- For Cloud SQL integration pass a substitution containing the full Cloud SQL instance string, e.g.: `--substitutions=_CLOUDSQL_INSTANCE=PROJECT:asia-southeast1:INSTANCE`. This value is used by the `--add-cloudsql-instances` flag and the job creation step.
When you create a trigger, set substitutions and secrets for `DATABASE_URL` and `CLOUDSQL_INSTANCE`.

### Setup Trigger

```bash
gcloud builds triggers create github \
  --repo-name=supershop \
  --repo-owner=Ishtiaqe \
  --branch-pattern="^main$" \
  --build-config=backend/cloudbuild.yaml
```

---

## Troubleshooting

### Issue: Cannot connect to Cloud SQL from Cloud Run

**Solution:** Ensure you're using the correct connection format:
```
postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:asia-southeast1:INSTANCE
```

### Issue: Migrations fail

**Solution:** Use Cloud SQL Proxy locally to run migrations:
```bash
./cloud-sql-proxy PROJECT:asia-southeast1:INSTANCE &
npm run prisma:migrate deploy
```

### Issue: Cloud Run service returns 502

**Solution:** 
- Check logs: `gcloud run services logs read supershop-backend`
- Ensure PORT is set to 8080
- Check DATABASE_URL is correct

### Issue: High Cloud SQL costs

**Solution:**
- Use `db-f1-micro` for development
- Enable auto-scaling for Cloud Run (min-instances=0)
- Use connection pooling in Prisma

---

## Next Steps

1. ✅ Set up custom domain for Cloud Run
2. ✅ Configure Cloud CDN
3. ✅ Set up Cloud Scheduler for cron jobs
4. ✅ Enable Cloud Armor for DDoS protection
5. ✅ Set up error reporting with Sentry
6. ✅ Configure automated backups

---

## Support

- **Google Cloud Docs:** [Cloud Run](https://cloud.google.com/run/docs) | [Cloud SQL](https://cloud.google.com/sql/docs)
- **Project Issues:** GitHub Issues
- **Email:** support@supershop.com

---

**Built for Google Cloud Platform 🚀**
