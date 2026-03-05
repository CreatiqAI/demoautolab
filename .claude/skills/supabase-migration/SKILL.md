---
name: supabase-migration
description: Create a new Supabase database migration SQL file with table definitions, RLS policies, indexes, and triggers following project patterns
user-invocable: true
disable-model-invocation: false
---

Create a Supabase database migration for the AutoLab project.

Migration purpose: $ARGUMENTS

## Requirements

1. Create the migration SQL file in `database/` directory
2. Follow the naming convention from existing files:
   - Feature additions: `PHASE2-feature-name.sql` or descriptive kebab-case name
   - Fixes: `FIX-description.sql` or `fix-description.sql`
   - Timestamped: `YYYYMMDDHHMMSS_description.sql`
3. Study existing migration patterns in `database/` directory

## Migration Template

```sql
-- ============================================================================
-- Migration: <description>
-- Created: <date>
-- Purpose: <what this migration does>
-- ============================================================================

-- ============================================================================
-- 1. Create Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.<table_name> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID DEFAULT NULL,
    -- Business fields
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_<table>_user_id ON public.<table_name>(user_id);
CREATE INDEX IF NOT EXISTS idx_<table>_status ON public.<table_name>(status);
CREATE INDEX IF NOT EXISTS idx_<table>_created_at ON public.<table_name>(created_at DESC);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================
-- Users can read their own rows
CREATE POLICY "<table>_select_own" ON public.<table_name>
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own rows
CREATE POLICY "<table>_insert_own" ON public.<table_name>
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own rows
CREATE POLICY "<table>_update_own" ON public.<table_name>
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin/staff can read all rows (check admin_users table)
CREATE POLICY "<table>_admin_select" ON public.<table_name>
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.role IN ('admin', 'manager', 'staff')
        )
    );

-- ============================================================================
-- 5. Updated_at Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_<table>_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_<table>_updated_at
    BEFORE UPDATE ON public.<table_name>
    FOR EACH ROW
    EXECUTE FUNCTION update_<table>_updated_at();

-- ============================================================================
-- 6. RPC Functions (if needed)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_<entity>_summary(p_user_id UUID)
RETURNS TABLE (
    total_count BIGINT,
    active_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_count
    FROM public.<table_name>
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Important Notes
- Always use `IF NOT EXISTS` for CREATE TABLE and CREATE INDEX
- Always enable RLS on new tables
- Always include `created_at` and `updated_at` timestamps
- Use UUID primary keys with `gen_random_uuid()`
- Reference `auth.users(id)` for user foreign keys
- Use `SECURITY DEFINER` on RPC functions that need to bypass RLS
- After creating the migration, remind to update `src/integrations/supabase/types.ts` by running `npx supabase db pull` or manually adding the types
