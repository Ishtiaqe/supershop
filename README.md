# 🏪 SuperShop Frontend - Multi-Tenant Shop Management Dashboard

A modern, responsive admin dashboard for the SuperShop multi-tenant shop management system. Built with Next.js, TypeScript, and Tailwind CSS for a seamless user experience.

## 📋 Overview

SuperShop Frontend provides a comprehensive dashboard for managing multiple shop branches or independent businesses. Each tenant (shop) has a dedicated interface for inventory, sales, analytics, and user management.

### **Key Features**

✅ **Multi-Tenant Dashboard** - Isolated views per store  
✅ **Inventory Management** - Real-time stock tracking with alerts  
✅ **POS System Interface** - Fast transaction management  
✅ **Sales Analytics** - Revenue, profit, and forecasting dashboards  
✅ **Role-Based Access** - SUPER_ADMIN, OWNER, EMPLOYEE permissions  
✅ **Responsive Design** - Modern UI built with Next.js & Tailwind  
✅ **Vercel Ready** - One-click deployment  

## 🛠️ **Technology Stack**

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Deployment**: Vercel (recommended)

## 📦 **Project Structure**

```bash
supershop/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   ├── login/         # Authentication
│   │   ├── dashboard/     # Main dashboard
│   │   │   ├── inventory/ # Inventory pages
│   │   │   ├── pos/       # POS interface
│   │   │   ├── sales/     # Sales reports
│   │   │   └── ...
│   │   ├── admin/         # Admin pages
│   │   └── tenant/        # Tenant setup
│   ├── components/        # React components
│   │   ├── providers.tsx  # Context providers
│   │   ├── dashboard/     # Dashboard components
│   │   ├── inventory/     # Inventory components
│   │   ├── pos/           # POS components
│   │   ├── sales/         # Sales components
│   │   └── shell/         # Layout shell
│   ├── lib/               # Utilities
│   │   └── api.ts         # API client
│   └── types/             # TypeScript types
├── public/                # Static assets
├── scripts/               # Utility scripts
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🚀 **Getting Started**

### **Prerequisites**

- **Node.js** 18+ and npm/yarn
- **Backend API** running (see backend repository)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/Ishtiaqe/supershop.git
cd supershop

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

**Frontend runs at:** `http://localhost:3000`

### **Environment Variables**

```env
NEXT_PUBLIC_API_URL=https://api.shomaj.one/api/v1
NEXT_PUBLIC_API_URL_BACKUP=https://supershop-backend-531309434570.asia-southeast1.run.app/api/v1
NEXT_PUBLIC_APP_NAME=SuperShop

### Sentry
Add the following environment variables to enable Sentry reporting in the frontend (optional):
- `NEXT_PUBLIC_SENTRY_DSN` — Your Sentry DSN for the frontend (public DSN)
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` — Default 0.05

### Sentry usage examples (frontend)

Use `@sentry/nextjs` for client/server error reporting. `sentry.client.config.js` and `sentry.server.config.js` are present and will initialize Sentry if `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` are set.

Example usage:

```tsx
import Sentry from '@/lib/sentry';

try {
   // Some operation
} catch (err) {
   Sentry.captureException(err);
}

// Tracing example
const span = Sentry.startSpan({ op: 'ui.click', name: 'Test Button' });
span.setAttribute('component', 'TestComponent');
// ... work
span.finish();
```

Use `Sentry.consoleLoggingIntegration` to capture `console.log/warn/error` in Sentry logs. Configure `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` as needed.
```

**Note:** The app includes automatic fallback to the backup API URL if the primary domain is unavailable.

## 🔐 **Authentication Flow**

```bash
1. Login → Enter credentials
   ↓
2. JWT tokens are set as HttpOnly cookies by the backend (NOT stored in localStorage)
   ↓
3. Authenticated requests send cookies (the backend will read tokens from HttpOnly cookies)
   ↓
4. Automatic token refresh on expiry
   ↓
5. Logout → Clear tokens
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
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://api.shomaj.one/api/v1`
   - `NEXT_PUBLIC_API_URL_BACKUP=https://supershop-backend-531309434570.asia-southeast1.run.app/api/v1`
4. Configure custom domain: `supershop.shomaj.one`
5. Deploy (automatic on every push to `main`)

**Zero configuration required!**

📖 **Detailed deployment instructions:** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

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

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:cov
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

## 🎯 **Roadmap**

- [ ] Mobile app (React Native)
- [ ] Advanced analytics & forecasting
- [ ] Barcode scanner integration
- [ ] Email notifications
- [ ] Export reports (PDF/Excel)
- [ ] Customer loyalty program

---

**Built with ❤️ for local shop owners**

**Author**: Ishtiaqe  
**Repository**: [github.com/Ishtiaqe/supershop](https://github.com/Ishtiaqe/supershop)
