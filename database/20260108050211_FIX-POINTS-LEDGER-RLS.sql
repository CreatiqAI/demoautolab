-- Fix RLS Policies for Customer Points Ledger
-- This allows admins to read all points data for analytics

-- Enable RLS on customer_points_ledger table (if not already enabled)
ALTER TABLE customer_points_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own points history" ON customer_points_ledger;
DROP POLICY IF EXISTS "Admins can view all points data" ON customer_points_ledger;
DROP POLICY IF EXISTS "System can insert points" ON customer_points_ledger;

-- Policy 1: Users can view their own points history
CREATE POLICY "Users can view their own points history"
ON customer_points_ledger
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customer_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Admins can view all points data
CREATE POLICY "Admins can view all points data"
ON customer_points_ledger
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 3: System can insert points (for triggers)
CREATE POLICY "System can insert points"
ON customer_points_ledger
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant necessary table permissions
GRANT SELECT ON customer_points_ledger TO authenticated;
GRANT INSERT ON customer_points_ledger TO authenticated;

SELECT '✅ RLS policies for customer_points_ledger created successfully!' as result;
