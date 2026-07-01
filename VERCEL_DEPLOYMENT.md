# 🚀 Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the SuperShop Frontend to Vercel. This is a static Vite SPA — there is no backend to deploy or coordinate with; the app talks directly to Supabase.

## 📋 Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- A Supabase project (Postgres + Auth) with URL and anon key

## ⚡ Quick Deploy (Recommended)

### 1. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `Ishtiaqe/supershop`
4. Set **Root Directory** to `supershop-frontend`

### 2. Project Configuration

Build settings are already defined in `vercel.json` and picked up automatically:

- **Framework Preset:** None / Other (`"framework": null` in `vercel.json`)
- **Build Command:** `npm run build:static` (`vite build`)
- **Output Directory:** `dist`
- **Install Command:** `npm install`

`vercel.json` also configures SPA fallback routing (all non-asset paths rewrite to `/index.html`) and cache headers for assets, manifest, and the service worker.

### 3. Environment Variables

Add the following environment variables in the Vercel dashboard:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Some legacy `NEXT_PUBLIC_*`-prefixed vars (API URLs, Firebase, GA, AdSense) are still read via `vite.config.ts`'s `define` block if set, but none of them point at a backend anymore — there is no backend fallback mechanism.

### 4. Deploy

1. Click **"Deploy"**
2. Wait for build completion (usually 1-2 minutes)
3. Your app will be available at `https://supershop.vercel.app` (or custom domain)

## 🔧 Advanced Configuration

### Custom Domain (Optional)

1. Go to Vercel project dashboard
2. Navigate to **"Settings"** → **"Domains"**
3. Add your domain: `supershop.shomaj.one`
4. Follow DNS configuration instructions
5. No backend CORS configuration is needed — the browser talks directly to Supabase, which is configured with allowed origins in the Supabase dashboard (Authentication → URL Configuration) if needed.

## 📊 Build Optimization

The project is pre-configured for optimal Vercel deployment:

- **Vite** static build with code splitting
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Service worker** (`vite-plugin-pwa`, `injectManifest` strategy) for offline asset caching

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
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase project's URL/anon key

# Test build locally
npm run build
npm run preview
```

### 2. Preview Deployments

Every push to feature branches creates a preview deployment:
- Automatic URL generation
- Same build process as production
- Isolated environment testing

### 3. Production Checks

Verify these after deployment:

- [ ] Login functionality works (Supabase Auth)
- [ ] Supabase queries succeed (inventory, sales, dashboard load)
- [ ] Dashboard loads correctly
- [ ] All routes are accessible (SPA fallback routing works — try a direct deep link)
- [ ] Responsive design on mobile
- [ ] No console errors

## 🛠️ Troubleshooting

### Build Failures

**Issue:** Build fails with dependency errors
```bash
# Check Node.js version compatibility
node --version  # Should be 24+ (see .nvmrc / package.json engines)
```

**Issue:** TypeScript errors
```bash
# Run type checking locally
npm run type-check
```

### Runtime Issues

**Issue:** Supabase calls failing
- Check `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set correctly in Vercel dashboard
- Check the Supabase project's API settings and RLS policies
- Check browser network tab for failed requests

**Issue:** Authentication not working
- Confirm Supabase Auth is enabled for the project and the site URL/redirect URLs are configured in Supabase (Authentication → URL Configuration)
- Check the browser console for Supabase client errors

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

`@vercel/analytics` and `@vercel/speed-insights` are already installed as dependencies.

## 🔐 Security Considerations

- ✅ **HTTPS enforced** (automatic)
- ✅ **CSP headers** (configurable)
- ✅ **Supabase anon key** is safe to expose client-side by design — enforce access control via Postgres RLS policies, not by hiding the key
- ✅ **Build security** (isolated builds)

## 📞 Support

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation:** [supabase.com/docs](https://supabase.com/docs)
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
