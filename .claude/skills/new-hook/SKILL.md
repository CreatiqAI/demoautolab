---
name: new-hook
description: Create a new React hook with Context+Provider pattern or standalone pattern, with Supabase integration and TypeScript types
user-invocable: true
disable-model-invocation: false
---

Create a new React hook for the AutoLab project.

Hook purpose: $ARGUMENTS

## Requirements

1. Create the hook file at `src/hooks/use<Name>.tsx` (use .tsx if it includes JSX like a Provider, .ts otherwise)
2. Study existing hooks for patterns:
   - Context+Provider pattern: `src/hooks/useAuth.tsx`, `src/hooks/useCart.tsx`, `src/hooks/usePricing.tsx`
   - Standalone hook pattern: `src/hooks/useReturns.ts`, `src/hooks/useDeviceSession.ts`

## Choose the Right Pattern

### If the hook provides shared global state (Context+Provider pattern):
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ContextType {
  // Define all exposed state and methods
}

const MyContext = createContext<ContextType | undefined>(undefined);

export function MyProvider({ children }: { children: ReactNode }) {
  // State and logic here
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

export function useMyHook() {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error('useMyHook must be used within a MyProvider');
  }
  return context;
}
```

### If the hook is standalone (no Provider needed):
```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useMyHook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('table').select('*').eq('user_id', user.id);
      if (error) throw error;
      setData(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  return { data, loading, error, fetchData, /* mutations */ };
}
```

## Key Requirements
- Export explicit TypeScript interfaces for all data types
- Include both query (fetch) and mutation (create/update/delete) functions
- Show toast notifications on success and error using `useToast` from `@/hooks/use-toast`
- Use `useCallback` for functions that are dependencies of `useEffect`
- Handle loading, error, and empty states
- If creating a Provider, remind to add it to the provider tree in `src/App.tsx`
- Export any helper/utility functions (like status labels, color mappings) alongside the hook, following the pattern in `src/hooks/useReturns.ts`
