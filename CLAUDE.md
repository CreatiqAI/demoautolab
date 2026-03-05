# AutoLab Website - Developer Guide

## Project Overview
B2B wholesale automotive accessories e-commerce platform for the Malaysian market. Built with React + TypeScript + Supabase.

## Tech Stack
- **Frontend**: React 18, TypeScript 5.8, Vite 5
- **Styling**: Tailwind CSS 3.4, shadcn/ui (Radix UI), Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State**: React Context (Auth, Cart, Pricing), React Query v5
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
- **Deployment**: Vercel

## Commands
```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run unit tests (Vitest)
npm run test:ui      # Unit tests with UI
npm run test:e2e     # E2E tests (Playwright)
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run type-check   # TypeScript check (npx tsc --noEmit)
npm run format       # Prettier format
```

## Project Structure
```
src/
├── pages/              # Route pages
│   ├── admin/          # Admin dashboard pages (25 pages)
│   └── warehouse/      # Warehouse operation pages
├── components/         # Reusable components
│   ├── admin/          # Admin-specific (AdminLayout, ProtectedAdminRoute)
│   ├── reviews/        # Review components
│   ├── warehouse/      # Warehouse components
│   └── ui/             # shadcn/ui primitives (50+ components)
├── hooks/              # React hooks (useAuth, useCart, useReturns, etc.)
├── services/           # Business logic & API integrations
├── lib/                # Utilities (supabase client, courier service)
├── integrations/       # Auto-generated Supabase types
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── utils/              # Utility functions
├── test/               # Test setup and test files
└── e2e/                # Playwright E2E tests

database/               # Supabase SQL migration files
supabase/functions/     # Supabase Edge Functions
n8n/                    # n8n automation workflows (WhatsApp, notifications)
```

## Key Conventions

### Imports (MUST follow these paths)
```tsx
import { supabase } from '@/lib/supabase';                    // Supabase client
import type { Tables, Enums } from '@/integrations/supabase/types'; // DB types
import { useToast } from '@/hooks/use-toast';                  // Toast notifications
import { useAuth } from '@/hooks/useAuth';                     // Authentication
import { cn } from '@/lib/utils';                              // Class merging
import { Button } from '@/components/ui/button';               // shadcn components
import { IconName } from 'lucide-react';                       // Icons
```

### Component Patterns
- **Admin pages**: `export default function PageName()` — renders inside `AdminLayout` via `<Outlet />`
- **Customer pages**: Wrap with `<Header />` + `<Footer />`
- **All components**: Use `cn()` for conditional classes, accept `className` prop
- **Currency**: `new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)`

### Supabase Patterns
- Use `.maybeSingle()` instead of `.single()` when the row may not exist (prevents 406 errors)
- Always wrap DB operations in try/catch with toast error feedback
- For tables not yet in generated types, cast with `as any`: `.from('table_name' as any)`
- RLS policies are enforced — queries must respect user ownership

### Authentication
- **Customer auth**: Supabase Auth (`useAuth` hook)
- **Admin auth**: Custom localStorage-based (`ProtectedAdminRoute` checks `localStorage.getItem('admin_user')`)

### File Naming
- Pages & Components: `PascalCase.tsx`
- Hooks: `use*.tsx` or `use*.ts`
- Services: `*Service.ts`
- UI primitives: `kebab-case.tsx` (shadcn convention)

### Routing
- Customer routes: Top-level in `<Routes>` in `App.tsx`
- Admin routes: Nested under `<Route path="/admin/*">` with `<AdminLayout />` parent
- Protected routes: Wrap with `<ProtectedAdminRoute>`

## Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
```

## Do NOT
- Use `console.log` in production code (all removed — keep it clean)
- Import supabase from `@/integrations/supabase/client` (use `@/lib/supabase`)
- Use `.single()` when the result might not exist (use `.maybeSingle()`)
- Hardcode API keys in source files (use environment variables)
- Use `dangerouslyAllowBrowser: true` for API clients in production
