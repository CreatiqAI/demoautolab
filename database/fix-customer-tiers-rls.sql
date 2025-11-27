-- Fix RLS Policies for customer_tiers table
-- This fixes the issue where admin updates don't persist

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can manage tiers" ON customer_tiers;

-- Recreate with proper USING and WITH CHECK clauses
CREATE POLICY "Admins can manage all tiers"
  ON customer_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- Also ensure authenticated users can view all tiers (not just active ones)
-- This is important for admin interface to show inactive tiers
DROP POLICY IF EXISTS "Anyone can view active tiers" ON customer_tiers;

CREATE POLICY "Everyone can view all tiers"
  ON customer_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Verify policies are correct
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'customer_tiers'
ORDER BY policyname;
