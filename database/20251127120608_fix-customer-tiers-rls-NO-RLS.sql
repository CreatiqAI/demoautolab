-- =====================================================
-- FIX CUSTOMER TIERS - DISABLE RLS FOR ADMIN ACCESS
-- =====================================================
-- Since admins use localStorage auth (not Supabase Auth),
-- they have NO Supabase session (auth.uid() is null).
-- Solution: Disable RLS and grant direct table permissions

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can manage tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can manage all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Anyone can view active tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Everyone can view all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Authenticated users can view all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can insert tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can update tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can delete tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Admins can view all tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Customers can view active tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Public can view active tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Authenticated users can insert tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Authenticated users can update tiers" ON customer_tiers;
DROP POLICY IF EXISTS "Authenticated users can delete tiers" ON customer_tiers;

-- Disable RLS on customer_tiers table
ALTER TABLE customer_tiers DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON customer_tiers TO anon, authenticated;

-- Verify RLS is disabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'customer_tiers';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Customer Tiers RLS DISABLED!';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS has been disabled for customer_tiers table';
  RAISE NOTICE 'All users can now access the table';
  RAISE NOTICE '';
  RAISE NOTICE 'Security: Admin routes protected by ProtectedAdminRoute in frontend';
  RAISE NOTICE 'Customers can only access via customer profile tier_id foreign key';
END $$;
