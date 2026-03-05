---
name: new-customer-page
description: Scaffold a new customer-facing page with Header, Footer, responsive layout, and optional auth protection
user-invocable: true
disable-model-invocation: false
---

Create a new customer-facing page for the AutoLab website.

Page name/feature: $ARGUMENTS

## Requirements

1. Create the page component at `src/pages/<PageName>.tsx`
2. Follow patterns from existing customer pages like `src/pages/Settings.tsx`, `src/pages/MyOrders.tsx`, `src/pages/SecondhandMarketplace.tsx`

## Mandatory Patterns

### Imports
```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
// shadcn/ui components as needed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// lucide-react icons as needed
```

### Component Structure
```tsx
const PageName = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated (if page requires auth)
  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page content */}
      </main>
      <Footer />
    </div>
  );
};

export default PageName;
```

### Styling
- Responsive: mobile-first with sm/md/lg breakpoints
- Use `container mx-auto px-4` for main content area
- Use shadcn Card components for content sections
- Lime green accents for primary actions and highlights
- Follow the visual style of existing pages like Settings and MyOrders

## After Creating the Page

1. Add import and route in `src/App.tsx`:
   ```tsx
   import PageName from './pages/PageName';
   <Route path="/page-slug" element={<PageName />} />
   ```

2. Add navigation link in `src/components/Header.tsx` if it should appear in the main nav

3. Verify with `npx tsc --noEmit`
