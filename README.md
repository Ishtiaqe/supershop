# 🏪 SuperShop Frontend - Multi-Tenant Shop Management Dashboard

A modern, responsive admin dashboard for the SuperShop multi-tenant shop management system. Built with Vite, React, TypeScript, and Tailwind CSS, backed by Supabase (Postgres + Auth). The frontend uses an in-process API router (`src/lib/api/routes/*`) that calls Supabase directly, so no separate backend server is required.

## 📋 Overview

SuperShop Frontend provides a comprehensive dashboard for managing multiple shop branches or independent businesses. Each tenant (shop) has a dedicated interface for inventory, sales, analytics, and user management.

### **Key Features**

✅ **Multi-Tenant Dashboard** - Isolated views per store  
✅ **Inventory Management** - Real-time stock tracking with alerts  
✅ **POS System Interface** - Fast transaction management  
✅ **Sales Analytics** - Revenue, profit, and forecasting dashboards  
✅ **Role-Based Access** - SUPER_ADMIN, OWNER, EMPLOYEE permissions  
✅ **Responsive Design** - Modern UI built with Vite, React Router & Tailwind  
✅ **Vercel Ready** - One-click deployment  

## 🛠️ **Technology Stack**

- **Framework**: Vite + React 18 + React Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query), persisted via `idb-keyval`
- **Data layer**: `@supabase/supabase-js` — direct Postgres/Auth access via in-process route handlers
- **Deployment**: Vercel (static build)

## 📦 **Project Structure**

```bash
supershop-frontend/
├── src/
│   ├── app/               # Route pages (folder name is a holdover from Next.js, not framework-special)
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   ├── login/         # Authentication
│   │   ├── dashboard/     # Main dashboard
│   │   ├── inventory/     # Inventory pages
│   │   ├── pos/           # POS interface
│   │   ├── sales-history/ # Sales reports
│   │   ├── admin/         # Admin pages
│   │   └── tenant/        # Tenant setup
│   ├── components/        # React components
│   │   ├── providers.tsx  # Context providers (React Query, Auth, Offline)
│   │   ├── auth/          # AuthProvider (Supabase Auth + users table profile)
│   │   ├── dashboard/     # Dashboard components
│   │   ├── inventory/     # Inventory components
│   │   ├── pos/           # POS components
│   │   ├── sales/         # Sales components
│   │   └── shell/         # Layout shell
│   ├── lib/
│   │   ├── api.ts         # In-process router shim (dispatches to lib/api/routes/* → Supabase)
│   │   ├── api/routes/    # One file per domain, each calling supabase.from(...)/rpc(...)
│   │   ├── supabase.ts    # Supabase client
│   │   ├── cache/         # IndexedDB master-data cache (products/variants)
│   │   └── offline-*.ts   # Offline queue/sync subsystem
│   └── types/             # TypeScript types
├── prisma/schema.prisma   # Schema/migration source of truth only (not used at runtime)
├── public/                # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.cjs
└── tsconfig.json
```

## 🚀 **Getting Started**

### **Prerequisites**

- **Node.js** 24+ (see `.nvmrc`/`engines`)
- **A Supabase project** (Postgres + Auth) — no separate backend to run

### **Installation**

```bash
# Clone the repository
git clone https://github.com/Ishtiaqe/supershop.git
cd supershop-frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

**Frontend runs at:** `http://localhost:3001`

### **Environment Variables**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Some `NEXT_PUBLIC_*`-prefixed vars (API URLs, Firebase, GA, AdSense) are still read via `vite.config.ts`'s `define` block — legacy naming kept for compatibility, not evidence of a live backend.

## 🔐 **Authentication Flow**

```bash
1. Login → Supabase Auth (email/password or OAuth)
   ↓
2. Supabase client manages session + token refresh internally
   ↓
3. AuthProvider (src/components/auth/AuthProvider.tsx) layers a `users` table
   profile lookup on top of the Supabase session (by email, then id, then
   falls back to Supabase user_metadata if the DB row lookup fails)
   ↓
4. Logout → supabase.auth.signOut(), AuthProvider clears cached profile + local storage
```

## 👥 **User Roles**

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | Full system access, manage all tenants |
| **OWNER** | Manage own store, view reports |
| **EMPLOYEE** | Add sales, view inventory |

## 🌍 **Deployment (Vercel)**

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Configure custom domain: `supershop.shomaj.one`
5. Deploy (automatic on every push to `main`)

**Zero configuration required!**

📖 **Deployment URL:** `https://supershop.shomaj.one`

## 📊 **Features**

### **Dashboard**

- Real-time metrics and KPIs
- Sales charts and analytics
- Inventory alerts
- Recent transactions

### **Inventory Management**

- Add/update/delete items
- Low stock alerts
- Expiring items tracking
- Batch restock operations

### **POS System**

- Create sales transactions
- Multiple payment methods
- Discount support
- Receipt generation

### **Sales Reports**

- Daily/monthly summaries
- Profit calculations
- Transaction history

### **User Management**

- Profile management
- Password changes
- Role assignments

## 🧪 **Testing**

No automated test suite is currently wired up (`npm run lint` and `npm run type-check` are the available checks).

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

## 🎯 **Roadmap**

- [x] Export reports (PDF)
- [ ] Mobile app (Capacitor)
- [ ] Advanced analytics & forecasting
- [ ] Barcode scanner integration
- [ ] Email notifications
- [ ] Customer loyalty program

---

**Built with ❤️ for local shop owners**

**Author**: Ishtiaqe  
**Repository**: [github.com/Ishtiaqe/supershop](https://github.com/Ishtiaqe/supershop)
