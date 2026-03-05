---
name: add-route
description: Add a new route to the application with correct import, route definition, navigation entry, and optional protection
user-invocable: true
disable-model-invocation: false
---

Add a new route to the AutoLab application.

Route details: $ARGUMENTS

## Routing Architecture Reference

The app uses React Router v6 with this structure in `src/App.tsx`:
- Customer routes: Top-level `<Route>` elements
- Admin routes: Nested under `<Route path="/admin/*">` with `<AdminLayout />` as parent element, wrapped in `<ProtectedAdminRoute>`
- Warehouse routes: Individual protected routes at `/warehouse/*`

## Steps

### 1. For a Customer Route

In `src/App.tsx`:
```tsx
// Add import at top (with other page imports)
import NewPage from './pages/NewPage';

// Add route inside <Routes> (before the NotFound catch-all)
<Route path="/new-page" element={<NewPage />} />
```

Optionally add to Header navigation in `src/components/Header.tsx` if it should be in the main nav.

### 2. For an Admin Route

In `src/App.tsx`:
```tsx
// Add import at top (with other admin imports)
import NewAdminPage from './pages/admin/NewAdminPage';

// Add route INSIDE the admin route block:
// <Route path="/admin/*" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
<Route path="new-page" element={<NewAdminPage />} />
```

Then add navigation in `src/components/admin/AdminLayout.tsx`:
```tsx
// Find the appropriate navigation group in the `navigation` array
// Add to an existing group's `items` array, or add as standalone:
{ name: 'New Page', href: '/admin/new-page', icon: IconName },

// Or add to a group:
{
  name: 'Group Name',
  icon: GroupIcon,
  items: [
    // existing items...
    { name: 'New Page', href: '/admin/new-page', icon: IconName },
  ]
},
```

Available navigation groups in AdminLayout: Dashboard, Analytics, Orders, Products, Customers, Rewards & Loyalty, Secondhand Marketplace, System.

### 3. For a Protected Non-Admin Route

```tsx
<Route path="/new-protected" element={
  <ProtectedAdminRoute allowedRoles={['admin', 'staff', 'manager']}>
    <NewPage />
  </ProtectedAdminRoute>
} />
```

## Verification
1. Run `npx tsc --noEmit` to check for import/type errors
2. Navigate to the route in the browser
3. Verify the page renders correctly within the layout
4. For admin routes, verify the sidebar navigation highlight works
