---
name: optimize-performance
description: Analyze a page or component for performance issues and provide concrete optimization recommendations for the AutoLab tech stack
user-invocable: true
disable-model-invocation: false
---

Analyze and optimize performance for the specified page or component.

Target: $ARGUMENTS

## Performance Analysis Checklist

### 1. Supabase Query Optimization
- Check for N+1 queries (multiple sequential queries that could be a single join)
- Use `.select('specific, columns')` instead of `.select('*')` for large tables
- Add proper indexes (check `database/` migrations)
- Use RPC functions for complex aggregations instead of client-side processing
- Check if queries can be cached or deduplicated

### 2. React Rendering Optimization
```tsx
// Memoize expensive computations
const filteredItems = useMemo(() =>
  items.filter(item => item.name.includes(searchTerm)),
  [items, searchTerm]
);

// Memoize callbacks passed to child components
const handleAction = useCallback((id: string) => {
  // ...
}, [dependency]);

// Memoize components that receive stable props
const MemoizedChild = React.memo(ChildComponent);
```

### 3. Bundle Size
- Check for large dependencies being imported entirely
- Use dynamic imports for heavy pages:
```tsx
const HeavyPage = lazy(() => import('./pages/HeavyPage'));
// In routes:
<Route path="/heavy" element={<Suspense fallback={<Loading />}><HeavyPage /></Suspense>} />
```

### 4. Image Optimization
- Use the project's `<OptimizedImage>` component from `src/components/ui/optimized-image.tsx`
- Implement lazy loading for off-screen images
- Use appropriate image sizes (don't load 2000px images for thumbnails)
- Use Supabase Storage image transformations if available

### 5. List/Table Performance
- For large lists (>100 items): implement pagination using Supabase `.range(from, to)`
- For real-time updates: use Supabase subscriptions sparingly
- Consider virtual scrolling for very long lists

### 6. State Management
- Avoid storing derived state (compute it from source state)
- Don't store server data in useState if React Query could manage it
- Check for unnecessary re-renders using React DevTools

### 7. Network Optimization
- Reduce waterfall requests (parallel fetch with `Promise.all`)
- Implement optimistic updates for better perceived performance
- Add proper loading skeletons using shadcn `<Skeleton />` component

## Output
Provide a prioritized list of optimizations with:
1. What to change
2. Why it improves performance
3. The actual code changes needed
4. Expected impact (high/medium/low)
