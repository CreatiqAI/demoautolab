-- Fix RLS Policies for Point Redemptions
-- This allows admins to view all redemptions and users to view their own

-- Enable RLS on point_redemptions table (if not already enabled)
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Users can create redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Admins can update redemptions" ON point_redemptions;

-- Policy 1: Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions"
ON point_redemptions
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customer_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Admins can view all redemptions
CREATE POLICY "Admins can view all redemptions"
ON point_redemptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 3: Users can create their own redemptions
CREATE POLICY "Users can create redemptions"
ON point_redemptions
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM customer_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 4: Admins can update redemption status
CREATE POLICY "Admins can update redemptions"
ON point_redemptions
FOR UPDATE
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
GRANT SELECT, INSERT ON point_redemptions TO authenticated;
GRANT UPDATE ON point_redemptions TO authenticated;

SELECT '✅ RLS policies for point_redemptions created successfully!' as result;
