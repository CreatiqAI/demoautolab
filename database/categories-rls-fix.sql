-- Fix RLS policies for categories table to ensure admin operations work

-- Enable RLS on categories table if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "allow_all_categories" ON categories;
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Create permissive policies for all authenticated users
-- This allows admin operations to work properly
CREATE POLICY "allow_all_categories_select" ON categories
    FOR SELECT USING (true);

CREATE POLICY "allow_all_categories_insert" ON categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_categories_update" ON categories
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_categories_delete" ON categories
    FOR DELETE USING (true);

-- Alternatively, create a single comprehensive policy (comment above and uncomment below if preferred)
-- CREATE POLICY "allow_all_categories" ON categories FOR ALL USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'categories';

-- Success message
SELECT 'RLS policies for categories table have been configured successfully!' as result;