# Copilot Instructions
# SuperShop AI Coding Instructions

## Architecture Overview
SuperShop is a multi-tenant shop management system with NestJS backend and Next.js frontend. All entities include `tenantId` for isolation. Roles: SUPER_ADMIN (system-wide), OWNER (tenant admin), EMPLOYEE (limited access).

**Backend Structure** (`supershop-backend/`):
- Modules: `auth`, `users`, `tenants`, `catalog`, `inventory`, `sales`, `notifications`
- Use Prisma ORM with PostgreSQL; run `npm run prisma:generate` after schema changes
- API prefix: `/api/v1`, Swagger docs at `/api/docs`
- Global validation pipes enforce DTOs; use class-validator decorators

**Frontend Structure** (`supershop-frontend/`):
- App Router with pages in `src/app/`
- Components in `src/components/` (dashboard, inventory, pos, sales, shell)
- TanStack Query for API calls with localStorage persistence
- Ant Design + Tailwind CSS; theme support (light/dark/system)
- API client (`src/lib/api.ts`) handles JWT auth and automatic fallback to backup URL

## Key Patterns
- **Tenant Isolation**: Always filter queries by `tenantId` from JWT payload. Example: `prisma.product.findMany({ where: { tenantId } })`
- **Auth Flow**: JWT access/refresh tokens stored in localStorage. API interceptor handles refresh and redirects to `/login` on failure
- **Error Handling**: Backend uses NestJS exceptions; frontend shows Antd notifications
- **Data Relations**: Products → Variants → InventoryItems → SaleItems. Use eager loading sparingly due to tenant data volume
- **File Naming**: Kebab-case for files (e.g., `auth.service.ts`), PascalCase for classes
- **Database Safety**: Never delete DB data directly. Always backup table data before operations that risk data loss, then restore or migrate data after. Use scripts like `prisma db push --accept-data-loss` cautiously and only after backups.

## Development Workflow
- **Backend Dev**: `npm run start:dev` (hot reload), `npm run build` (includes Prisma generate), `npm run test` (Jest unit tests)
- **Frontend Dev**: `npm run dev`, `npm run build`, `npm run lint`, `npx playwright test` (E2E tests)
- **Database**: Use `prisma studio` for data inspection. Migrations: `prisma migrate dev` (dev), `prisma migrate deploy` (prod)
- **Deployment**: Backend on Cloud Run (PORT env var), Frontend on Vercel with `NEXT_PUBLIC_API_URL` and backup fallback

## Common Tasks
- **Add Entity**: Create Prisma model with `tenantId`, add to `Tenant` relations, generate DTOs in module, implement CRUD in service/controller
- **API Endpoint**: Use `@Get/@Post` decorators, validate with DTOs, return consistent response format
- **Frontend Component**: Use hooks for data fetching, Antd components, handle loading/error states
- **Test**: Unit tests in `*.spec.ts`, E2E with Playwright using test credentials from `TEST_CREDENTIALS.md`. For API testing, use account: owner@shop1.com / Owner123!

## Integration Points
- **Google OAuth**: Configured in backend with client ID/secret; callback URL must match production domain
- **Push Notifications**: Web Push API with VAPID keys; subscriptions stored in `PushSubscription` model
- **PWA**: Service worker in `public/sw.js`, manifest in `public/manifest.json`

Reference: `README.md`, `DEPLOYMENT_GUIDE.md`, `prisma/schema.prisma`

## Terminal Usage Guidelines

Always run long-lived servers like `npm run dev` in one terminal and API calls in a separate new terminal.