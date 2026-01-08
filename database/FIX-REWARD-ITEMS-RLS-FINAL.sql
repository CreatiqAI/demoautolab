-- Fix Reward Items RLS for Custom Admin Authentication
-- Since admins use custom auth (not Supabase Auth), allow anon role
-- UI controls access to admin panel

-- Enable RLS
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow authenticated users full access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow full access to reward items" ON reward_items;

-- Policy 1: Public can read active items
CREATE POLICY "Allow public read access to reward items"
ON reward_items FOR SELECT
TO public
USING (is_active = true);

-- Policy 2: Allow full access (INSERT, UPDATE, DELETE) to all roles
-- Access control is handled by admin panel UI
CREATE POLICY "Allow full access to reward items"
ON reward_items FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON reward_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reward_items TO anon, authenticated;

SELECT '✅ Reward items policies updated - creation should now work!' as result;
SELECT '⚠️ Note: Access control relies on admin panel UI authentication.' as note;
