# Backend Collapse — Phases B4-B7 Implementation Guide

Rapid implementation guide for the final phases of backend collapse.

---

## Phase B4 — Edge Cases ✅ (Complete)

### 1. Backup (decided: rely on Supabase)
- Supabase free tier provides daily backups (sufficient for production)
- No `/api/v1/backup` route needed in Next.js
- User should enable Supabase backup notifications in dashboard
- **Action:** None required; Supabase handles it

### 2. Throttling (decided: drop)
- Internal shop floor app, low traffic
- Vercel serverless functions have built-in rate limits
- Re-add if production soak shows need
- **Action:** None required; remove from design

### 3. Static Files (/img)
**Current:** NestJS serves from `dist/img` via `ServeStaticModule`
**Action:**
```bash
# Copy image assets to public/
cp -r supershop-backend/dist/img supershop-frontend/public/img
```

Vercel automatically serves `/public/img` at `/img/*` (no config needed).
Next.js built-in static file serving handles caching.

---

## Phase B5 — Build Profiles

**Problem:** `output: 'export'` (mobile static export) cannot emit `/app/api` route handlers.

**Solution:** Conditional guard in `next.config.js`:

```js
// next.config.js
const config = {
  webpack: (config, { isServer }) => {
    if (process.env.NEXT_PUBLIC_OUTPUT === 'export') {
      config.resolve.alias['@/app/api'] = false
    }
    return config
  },
  output: process.env.NEXT_PUBLIC_OUTPUT || undefined,
}

module.exports = config
```

**Build commands:**
```bash
# Web build (with API routes)
npm run build

# Mobile build (static export, no API)
NEXT_PUBLIC_OUTPUT=export npm run build:static
```

---

## Phase B6 — Cutover (Reversible)

**Steps:**
1. Deploy to Vercel (git push, auto-deploy)
2. Set env: `NEXT_PUBLIC_API_URL=https://vercel-url/api/v1`, keep `NEXT_PUBLIC_API_URL_BACKUP=cloud-run-url`
3. Smoke test (login → POS → shortlist → offline queue)
4. Monitor Vercel logs + Supabase pool
5. **Rollback:** Change env var back, 1-2 min redeploy

---

## Phase B7 — Decommission

**Timeline:** Only after 24-48h stable on Vercel

**Steps:**
```bash
# Scale Cloud Run to 0
gcloud run services update supershop-api --min-instances=0

# Archive backend repo
cd supershop-backend && git tag archive/main && git push origin archive/main

# Update runbook: migrations now in supershop-frontend/prisma/
```

**Final cost:** ~$0/month (Vercel Functions + Supabase free tier)

---

## Remaining Modules (B3 pattern)

All follow this template:

```typescript
// src/app/api/v1/{module}/{endpoint}/route.ts
async function handler(req: AuthenticatedRequest) {
  const tenantId = requireTenantId(req)
  // GET (list), POST (create), PUT (update), DELETE (delete)
  // Return: ResponseHelper.ok() / .error()
}

export const GET = withCors(withAuth(handler))
export const POST = withCors(withAuth(handler, ['OWNER', 'EMPLOYEE']))
export const OPTIONS = withCors((req) => new Response(null, { status: 204 }))
```

**Remaining modules (follow same pattern):**
- categories, brands, medicines, expenses, credits (no side effects)
- users, tenants (light references)
- notifications, pdf-export (utility)

---

## Success Criteria

✅ All phases B0-B7 complete
✅ Data row counts match (no loss)
✅ All critical flows pass (login, POS, offline)
✅ Mobile app works (CORS)
✅ 24-48h stable on Vercel
✅ Cloud Run decommissioned ($0/mo)
✅ Type-check + build green
