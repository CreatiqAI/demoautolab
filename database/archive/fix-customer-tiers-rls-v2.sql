-- Fix RLS Policies for customer_tiers table (Version 2)
-- This properly scopes policies to authenticated users

-- Drop ALL existing policies on customer_tiers
DROP POLICY IF EXISTS "Admins can manage tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can manage all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Anyone can view active tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Everyone can view all tiers" ON customer_tiers;

-- Create SELECT policy for all authenticated users to view all tiers
CREATE POLICY "Authenticated users can view all tiers"
  ON customer_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Create INSERT policy for admins only
CREATE POLICY "Admins can insert tiers"
  ON customer_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- Create UPDATE policy for admins only
CREATE POLICY "Admins can update tiers"
  ON customer_tiers
  FOR UPDATE
  TO authenticated
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

-- Create DELETE policy for admins only
CREATE POLICY "Admins can delete tiers"
  ON customer_tiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

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
