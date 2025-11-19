# 🚀 Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the SuperShop Frontend to Vercel.

## 📋 Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- Backend API deployed at `https://api.shomaj.one`

## ⚡ Quick Deploy (Recommended)

### 1. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `Ishtiaqe/supershop`
4. Configure project settings:

### 2. Project Configuration

**Framework Preset:** Next.js (automatically detected)

**Root Directory:** `./` (leave default)

**Build Settings:**
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### 3. Environment Variables

Add the following environment variables in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://api.shomaj.one/api/v1
NEXT_PUBLIC_API_URL_BACKUP=https://supershop-backend-531309434570.asia-southeast1.run.app/api/v1
NEXT_PUBLIC_APP_NAME=SuperShop
```

**Note:** The app will automatically fallback to the backup URL if the primary API is unavailable (network errors, server errors, or connection issues).

### 4. Fallback Mechanism

The application includes automatic API fallback functionality:

- **Primary URL:** `https://api.shomaj.one/api/v1` (preferred)
- **Backup URL:** `https://supershop-backend-531309434570.asia-southeast1.run.app/api/v1`
- **Fallback Triggers:** Network errors, server errors (5xx), connection failures
- **Logging:** Console warnings when switching to backup URL

### 4. Deploy

1. Click **"Deploy"**
2. Wait for build completion (usually 2-3 minutes)
3. Your app will be available at `https://supershop.vercel.app` (or custom domain)

## 🔧 Advanced Configuration

### Custom Domain (Optional)

1. Go to Vercel project dashboard
2. Navigate to **"Settings"** → **"Domains"**
3. Add your domain: `supershop.shomaj.one`
4. Follow DNS configuration instructions
5. **Update CORS** on both backend deployments to allow: `https://supershop.shomaj.one`

### Environment-Specific Variables

For different environments:

- **Production:** `https://api.shomaj.one/api/v1`
- **Preview/Staging:** `https://api-staging.shomaj.one/api/v1` (if available)
- **Development:** `http://localhost:8080/api/v1`

## 📊 Build Optimization

### Build Settings

The project is pre-configured for optimal Vercel deployment:

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Automatic code splitting**
- **Image optimization**
- **Static generation** where possible

### Performance Features

- ✅ **CDN Distribution** (automatic)
- ✅ **Edge Network** (global)
- ✅ **Automatic HTTPS**
- ✅ **Build Caching**
- ✅ **Preview Deployments**

## 🔍 Testing Deployment

### 1. Local Testing

Before deploying, test with production environment variables:

```bash
# Copy production environment
cp .env.example .env.local

# Edit .env.local with production URL
NEXT_PUBLIC_API_URL=https://api.shomaj.one/api/v1

# Test build locally
npm run build
npm run start
```

### 2. Preview Deployments

Every push to feature branches creates a preview deployment:
- Automatic URL generation
- Same build process as production
- Isolated environment testing

### 3. Production Checks

Verify these after deployment:

- [ ] Login functionality works
- [ ] API calls succeed (`/auth/login`, `/tenants/me`, etc.)
- [ ] Dashboard loads correctly
- [ ] All routes are accessible
- [ ] Responsive design on mobile
- [ ] No console errors

## 🛠️ Troubleshooting

### Build Failures

**Issue:** Build fails with dependency errors
```bash
# Check Node.js version compatibility
node --version  # Should be 18+
npm --version   # Should be 8+
```

**Issue:** TypeScript errors
```bash
# Run type checking locally
npm run type-check
```

### Runtime Issues

**Issue:** API calls failing
- Check environment variables in Vercel dashboard
- Verify backend CORS settings allow Vercel domain
- Check browser network tab for failed requests

**Issue:** Authentication not working
- Ensure JWT tokens are properly stored/retrieved
- Check token refresh logic
- Verify backend `/auth/refresh` endpoint

### Performance Issues

**Issue:** Slow loading times
- Check Vercel's analytics for bottlenecks
- Optimize images and bundles
- Consider code splitting improvements

## 🔄 Updates and Rollbacks

### Automatic Deployments

- **Main branch:** Deploys to production
- **Feature branches:** Creates preview deployments
- **Pull requests:** Automatic preview URLs

### Manual Rollbacks

1. Go to Vercel project dashboard
2. Navigate to **"Deployments"** tab
3. Find previous working deployment
4. Click **"..."** → **"Rollback"**

## 📈 Monitoring

### Vercel Analytics

- **Real-time metrics:** Response times, error rates
- **Performance insights:** Core Web Vitals
- **Usage statistics:** Bandwidth, requests

### Error Tracking

Consider integrating error monitoring:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Vercel Analytics** for basic monitoring

## 🔐 Security Considerations

- ✅ **HTTPS enforced** (automatic)
- ✅ **CSP headers** (configurable)
- ✅ **Environment variables** (server-side only)
- ✅ **Build security** (isolated builds)

## 📞 Support

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment:** [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **GitHub Issues:** Report issues in repository

## 🎯 Success Checklist

- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Domain configured (optional)
- [ ] All features tested
- [ ] Performance verified
- [ ] Monitoring set up

---

**Deployment URL:** `https://supershop.shomaj.one`  
**API Endpoint:** `https://api.shomaj.one/api/v1`  
**Last Updated:** November 2025