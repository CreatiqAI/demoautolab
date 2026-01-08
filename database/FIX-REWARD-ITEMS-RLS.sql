-- Fix RLS Policies for Reward Items
-- This allows admins to create, update, and delete reward items

-- Enable RLS on reward_items table (if not already enabled)
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to active reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow admin full access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow authenticated users to read reward items" ON reward_items;

-- Policy 1: Allow everyone to read active reward items
CREATE POLICY "Allow public read access to reward items"
ON reward_items
FOR SELECT
TO public
USING (is_active = true);

-- Policy 2: Allow admins full access (insert, update, delete)
CREATE POLICY "Allow admin full access to reward items"
ON reward_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Grant necessary table permissions
GRANT SELECT ON reward_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reward_items TO authenticated;

SELECT '✅ RLS policies for reward_items created successfully!' as result;
