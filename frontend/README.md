# ShopSys Frontend

Admin dashboard for ShopSys multi-tenant shop management system.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **React Query** (TanStack Query)
- **Axios** for API calls

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=ShopSys
```

## Project Structure

```
src/
├── app/                # Next.js app router
│   ├── (auth)/        # Auth pages (login, register)
│   ├── (dashboard)/   # Dashboard pages
│   └── layout.tsx     # Root layout
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   └── ...            # Custom components
├── lib/               # Utilities
│   └── api.ts         # API client
└── types/             # TypeScript types
```

## Features

- ✅ Authentication (Login/Register)
- ✅ Dashboard with metrics
- ✅ Inventory management
- ✅ Sales/POS interface
- ✅ Reports & analytics
- ✅ User management
- ✅ Responsive design

## Building for Production

```bash
npm run build
npm run start
```

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

## License

MIT
