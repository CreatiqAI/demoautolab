---
name: new-admin-page
description: Scaffold a new admin dashboard page with Supabase data fetching, shadcn/ui components, and AdminLayout integration
user-invocable: true
disable-model-invocation: false
---

Create a new admin page for the AutoLab admin dashboard.

Page name/feature: $ARGUMENTS

## Requirements

1. Create the page component at `src/pages/admin/<PageName>.tsx`
2. Follow the EXACT patterns used in existing admin pages like `src/pages/admin/Dashboard.tsx`, `src/pages/admin/Products.tsx`, and `src/pages/admin/Orders.tsx`

## Mandatory Patterns

### Imports
- Supabase client: `import { supabase } from '@/lib/supabase'`
- Toast: `import { useToast } from '@/hooks/use-toast'`
- shadcn/ui components from `@/components/ui/*` (Card, Button, Table, Badge, Input, Dialog, etc.)
- Icons from `lucide-react`
- Types from `@/integrations/supabase/types` using `type Tables<'table_name'>` pattern

### Component Structure
```tsx
export default function PageName() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('table').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setData(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  // ... rest
}
```

### UI Layout
- Page title with icon and description at top
- Action buttons (Add, Export) in top-right area
- Search/filter bar
- Data display using shadcn `Table` or `Card` grid
- Loading skeleton states
- Empty state with helpful message
- Dialog/Sheet for create/edit forms
- Use MYR (RM) currency formatting: `new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)`

### Styling
- Use Tailwind CSS classes with the project's lime green accent where appropriate
- Use `cn()` from `@/lib/utils` for conditional classes
- Follow the gray-50 background, white card pattern used in existing admin pages

## After Creating the Page

1. Add the import and route in `src/App.tsx` inside the admin routes block:
   ```tsx
   import PageName from './pages/admin/PageName';
   // Inside <Route path="/admin/*"> :
   <Route path="page-slug" element={<PageName />} />
   ```

2. Add navigation entry in `src/components/admin/AdminLayout.tsx` in the appropriate navigation group

3. Verify it compiles with `npx tsc --noEmit`
