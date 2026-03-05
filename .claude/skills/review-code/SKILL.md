---
name: review-code
description: Perform a comprehensive code review focused on AutoLab project patterns, common mistakes, security issues, and Supabase best practices
user-invocable: true
disable-model-invocation: false
---

Perform a comprehensive code review of the following code or files.

Target: $ARGUMENTS

## Review Checklist

### 1. Import Patterns
- [ ] Supabase imported from `@/lib/supabase` (NOT `@/integrations/supabase/client`)
- [ ] Types imported from `@/integrations/supabase/types` where available
- [ ] All imports use `@/` path aliases (no relative `../../` paths for deep imports)
- [ ] No unused imports
- [ ] Toast uses `useToast` from `@/hooks/use-toast` (preferred) or `toast` from `sonner`

### 2. TypeScript Quality
- [ ] No `any` types where proper types are available (check `Tables<'name'>` in supabase types)
- [ ] Props interfaces defined for all components
- [ ] Return types specified for exported functions
- [ ] Proper null/undefined handling

### 3. Supabase Patterns
- [ ] Using `.maybeSingle()` instead of `.single()` when row may not exist
- [ ] Error handling on every Supabase call (try/catch or if(error))
- [ ] Using `as any` cast only for tables not yet in generated types
- [ ] Not exposing service role keys or sensitive data in client code
- [ ] Using proper RLS-aware queries (filtering by user_id where appropriate)

### 4. React Patterns
- [ ] No missing dependency arrays in `useEffect`/`useCallback`/`useMemo`
- [ ] Cleanup functions in `useEffect` for subscriptions/timers
- [ ] Loading states handled (skeleton or spinner)
- [ ] Error states handled with user-friendly messages
- [ ] No state updates on unmounted components
- [ ] Keys provided for list items

### 5. Security Review
- [ ] No hardcoded API keys or secrets (check `src/config/api-keys.ts` pattern)
- [ ] User input sanitized before database queries
- [ ] Auth checks in place for protected actions
- [ ] No XSS vulnerabilities (dangerouslySetInnerHTML)
- [ ] File uploads validated (type, size)

### 6. UI/UX Consistency
- [ ] Using shadcn/ui components (not raw HTML for forms, buttons, dialogs)
- [ ] Toast notifications for user feedback on actions
- [ ] Responsive design (tested at mobile breakpoints)
- [ ] Using `cn()` for conditional class merging
- [ ] Following lime green accent theme
- [ ] Currency displayed as MYR with `Intl.NumberFormat('en-MY', ...)`
- [ ] Empty states have helpful messages

### 7. Performance
- [ ] No unnecessary re-renders (check dependency arrays)
- [ ] Large lists should consider pagination
- [ ] Images use optimized loading (check `src/components/ui/optimized-image.tsx`)
- [ ] No synchronous heavy operations in render

### 8. Naming Conventions
- [ ] Hooks: `use*.tsx` or `use*.ts`
- [ ] Services: `*Service.ts`
- [ ] Pages: PascalCase `.tsx`
- [ ] Components: PascalCase `.tsx`
- [ ] Types: PascalCase interfaces

Report findings grouped by severity: CRITICAL, WARNING, SUGGESTION.
