---
name: debug-supabase
description: Systematically debug Supabase issues including 406 errors, RLS permission denied, query failures, and auth problems
user-invocable: true
disable-model-invocation: false
---

Debug a Supabase issue in the AutoLab project.

Problem description: $ARGUMENTS

## Systematic Debugging Steps

### 1. Identify the Error Type

Check the browser console and Supabase response for:
- **406 (Not Acceptable)**: Usually means `.single()` returned 0 or >1 rows. Fix: Use `.maybeSingle()` instead of `.single()` when the row may not exist.
- **403 (Forbidden)**: RLS policy blocking access. Check policies in `database/` migration files.
- **PGRST116**: No rows found with `.single()`. Same fix as 406.
- **23505**: Unique constraint violation. Check for duplicate entries.
- **42501**: Insufficient privileges. Check RLS or function permissions.

### 2. Common Fixes by Error Type

#### 406 / PGRST116 Fix
```tsx
// WRONG - throws error if no row exists
const { data, error } = await supabase.from('table').select('*').eq('id', id).single();

// CORRECT - returns null if no row exists
const { data, error } = await supabase.from('table').select('*').eq('id', id).maybeSingle();
```

#### RLS Policy Issues
Check if the table has proper RLS policies:
1. Look in `database/` for the migration that created the table
2. Ensure policies exist for the operation (SELECT/INSERT/UPDATE/DELETE)
3. For admin operations, ensure the policy checks `admin_users` table:
```sql
CREATE POLICY "admin_access" ON public.table_name
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    );
```

#### Auth Issues
- Check if user is authenticated: verify `useAuth()` returns a valid `user` object
- Check `localStorage` for `admin_user` key (admin auth uses localStorage, not Supabase auth)
- The project has TWO auth systems:
  - Customer auth: Supabase Auth (`useAuth` hook, `supabase.auth`)
  - Admin auth: Custom localStorage-based (`ProtectedAdminRoute` checks `localStorage.getItem('admin_user')`)

#### Type Casting for New Tables
If a table was recently added and not in the generated types:
```tsx
// Cast the table name to bypass TypeScript errors
const { data, error } = await supabase.from('new_table' as any).select('*');
```

### 3. Debugging Checklist
- [ ] Check browser Network tab for the actual HTTP response
- [ ] Check the Supabase dashboard SQL editor to test the query directly
- [ ] Verify the table exists and has data in Supabase dashboard
- [ ] Check if RLS is enabled and policies are correct
- [ ] For queries with joins, verify foreign key relationships exist
- [ ] Check if the user has the right role/permissions
- [ ] Check if `tenant_id` filtering is needed

### 4. Testing the Fix
After applying the fix:
1. Clear browser cache and localStorage if auth-related
2. Check the Network tab to verify the query succeeds
3. Run `npx tsc --noEmit` to verify no TypeScript errors
