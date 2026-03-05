---
name: fix-build
description: Diagnose and fix TypeScript compilation errors and Vite build failures with project-specific knowledge of common issues
user-invocable: true
disable-model-invocation: false
---

Diagnose and fix build/type-check errors in the AutoLab project.

Error details (if any): $ARGUMENTS

## Diagnostic Steps

### 1. Run Type Check
```bash
npx tsc --noEmit
```

### 2. Run Build
```bash
npm run build
```

### 3. Common AutoLab-Specific Errors and Fixes

#### Supabase Type Errors
**Error**: `Property 'table_name' does not exist on type ...`
**Fix**: The table was added via migration but types weren't regenerated. Use `as any` cast:
```tsx
await supabase.from('new_table' as any).select('*');
```

**Error**: `Type 'X' is not assignable to type 'Tables<"table">'`
**Fix**: Check `src/integrations/supabase/types.ts` for the exact Row type. The Insert and Update types have different optional fields.

#### Import Path Errors
**Error**: `Cannot find module '@/...'`
**Fix**: Verify the path alias works. Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```
Also check `vite.config.ts` for the matching resolve alias.

#### shadcn/ui Component Errors
**Error**: Missing shadcn component
**Fix**: Install the component:
```bash
npx shadcn-ui@latest add <component-name>
```

#### React Hook Errors
**Error**: `React Hook useEffect has a missing dependency`
**Fix**: Add the missing dependency or wrap with `useCallback`:
```tsx
const fetchData = useCallback(async () => { ... }, [dep1, dep2]);
useEffect(() => { fetchData(); }, [fetchData]);
```

#### Unused Variable Warnings
**Error**: `'x' is declared but its value is never read`
**Fix**: Remove unused imports/variables, or prefix with underscore: `_unusedVar`

### 4. ESLint Issues
```bash
npm run lint
npm run lint:fix  # Auto-fix what's possible
```

### 5. Post-Fix Verification
After fixing errors:
1. `npx tsc --noEmit` -- should show 0 errors
2. `npm run build` -- should complete successfully
3. `npm run preview` -- verify the production build works
