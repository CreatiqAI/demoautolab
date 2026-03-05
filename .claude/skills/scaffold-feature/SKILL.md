---
name: scaffold-feature
description: Generate a complete feature scaffold including page, hook, service, types, tests, route registration, and migration -- a full vertical slice
user-invocable: true
disable-model-invocation: false
---

Scaffold a complete new feature for the AutoLab project.

Feature description: $ARGUMENTS

## Full Feature Scaffold

Analyze the feature requirements and create ALL necessary files following the project's architecture. For each file, follow the exact patterns used in similar existing features.

### Step 1: Database Migration (if needed)
Create `database/<feature-name>.sql` with:
- Table creation with UUID primary key, timestamps, foreign keys
- Indexes for common query patterns
- RLS policies for customer and admin access
- RPC functions for complex operations
- Pattern reference: `database/returns-schema.sql`, `database/voucher-system.sql`

### Step 2: TypeScript Types
If the table is not in generated types, add interface to `src/types/<feature>.ts`:
```tsx
export interface FeatureEntity {
  id: string;
  // ... fields matching the migration schema
  created_at: string;
  updated_at: string;
}
```

### Step 3: Service Layer (if complex logic)
Create `src/services/<feature>Service.ts` for:
- External API integrations
- Complex business logic
- Data transformations
- Pattern reference: `src/services/knowledgeBaseService.ts`

### Step 4: React Hook
Create `src/hooks/use<Feature>.ts` with:
- CRUD operations against Supabase
- Loading/error state management
- Toast notifications for user feedback
- Pattern reference: `src/hooks/useReturns.ts`

### Step 5: UI Components
Create components in `src/components/<feature>/`:
- Reusable sub-components for the feature
- Follow shadcn/ui composition patterns
- Pattern reference: `src/components/reviews/ReviewForm.tsx`

### Step 6: Pages
Create pages in `src/pages/` and/or `src/pages/admin/`:
- Customer-facing page with Header/Footer
- Admin management page for AdminLayout
- Pattern reference: `src/pages/MyReturns.tsx` (customer), `src/pages/admin/Returns.tsx` (admin)

### Step 7: Route Registration
Update `src/App.tsx`:
- Import the new page(s)
- Add route definitions in the appropriate section
- For admin: add to the admin routes block and AdminLayout navigation

### Step 8: Tests
Create tests in `src/test/`:
- Unit tests for the hook and service
- Component tests for key UI components
- Pattern reference: `src/test/components/Header.test.tsx`

## Implementation Order
1. Database migration first (schema must exist before code)
2. Types (so everything downstream is properly typed)
3. Service layer (pure logic, testable independently)
4. Hook (connects service to React)
5. Components (UI building blocks)
6. Pages (assemble components into routes)
7. Route registration (wire into the app)
8. Tests (verify everything works)

## Key AutoLab Conventions
- Supabase client: `import { supabase } from '@/lib/supabase'`
- Toast: `import { useToast } from '@/hooks/use-toast'`
- Utils: `import { cn } from '@/lib/utils'`
- Currency: `new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)`
- Use `.maybeSingle()` instead of `.single()` when row may not exist
- Admin pages: `export default function PageName()` (no layout wrapper)
- Customer pages: wrap with `<Header />` and `<Footer />`

## Verification Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] New page renders at the correct URL
- [ ] Admin page appears in sidebar navigation
- [ ] Data loads from Supabase correctly
- [ ] Create/update/delete operations work
- [ ] Toast notifications appear on success/error
- [ ] Page is responsive on mobile
- [ ] Tests pass with `npm test`
