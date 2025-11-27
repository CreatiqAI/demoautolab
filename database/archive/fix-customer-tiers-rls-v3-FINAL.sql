-- Fix RLS Policies for customer_tiers table (FINAL VERSION)
-- Uses admin_profiles table like other admin features

-- Drop ALL existing policies on customer_tiers
DROP POLICY IF EXISTS "Admins can manage tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can manage all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Anyone can view active tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Everyone can view all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Authenticated users can view all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can insert tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can update tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can delete tiers" ON customer_tiers;

-- Create SELECT policy for admins (matches premium_partnerships pattern)
CREATE POLICY "Admins can view all tiers"
  ON customer_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Create INSERT policy for admins
CREATE POLICY "Admins can insert tiers"
  ON customer_tiers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Create UPDATE policy for admins
CREATE POLICY "Admins can update tiers"
  ON customer_tiers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Create DELETE policy for admins only (not staff)
CREATE POLICY "Admins can delete tiers"
  ON customer_tiers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
      AND is_active = true
    )
  );

-- Allow customers to view active tiers (for tier badges, benefits display, etc.)
CREATE POLICY "Customers can view active tiers"
  ON customer_tiers
  FOR SELECT
  USING (is_active = true);

-- Verify policies are correct
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'customer_tiers'
ORDER BY cmd, policyname;
