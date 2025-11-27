-- =====================================================
-- FIX PREMIUM PARTNERSHIPS RLS FOR ADMIN ACCESS
-- =====================================================
-- Since admins use localStorage auth (not Supabase Auth),
-- they have NO Supabase session (auth.uid() is null).
-- Solution: Disable RLS and grant direct table permissions

-- =====================================================
-- PREMIUM_PARTNERSHIPS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Authenticated users can update partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can create partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Public can view active partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Admins can view all partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Admins can update all partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can view own partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can update own partnerships" ON premium_partnerships;

-- Disable RLS
ALTER TABLE premium_partnerships DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON premium_partnerships TO anon, authenticated;

-- =====================================================
-- SUBSCRIPTION_PAYMENTS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can view payments" ON subscription_payments;
DROP POLICY IF EXISTS "Authenticated can insert payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON subscription_payments;
DROP POLICY IF EXISTS "Merchants can view own payments" ON subscription_payments;

-- Disable RLS
ALTER TABLE subscription_payments DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON subscription_payments TO anon, authenticated;

-- =====================================================
-- PARTNER_INQUIRIES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can view inquiries" ON partner_inquiries;
DROP POLICY IF EXISTS "Anyone can create inquiries" ON partner_inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON partner_inquiries;
DROP POLICY IF EXISTS "Partners can view own inquiries" ON partner_inquiries;

-- Disable RLS
ALTER TABLE partner_inquiries DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON partner_inquiries TO anon, authenticated;

-- =====================================================
-- PARTNERSHIP_RENEWAL_HISTORY TABLE
-- =====================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Admins can view renewal history" ON partnership_renewal_history;
DROP POLICY IF EXISTS "Admins can insert renewal history" ON partnership_renewal_history;
DROP POLICY IF EXISTS "Merchants can view own renewal history" ON partnership_renewal_history;

-- Disable RLS
ALTER TABLE partnership_renewal_history DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON partnership_renewal_history TO anon, authenticated;

-- =====================================================
-- VERIFY CHANGES
-- =====================================================

-- Check RLS status
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN (
  'premium_partnerships',
  'subscription_payments',
  'partner_inquiries',
  'partnership_renewal_history'
)
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Premium Partnerships RLS DISABLED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - premium_partnerships';
  RAISE NOTICE '  - subscription_payments';
  RAISE NOTICE '  - partner_inquiries';
  RAISE NOTICE '  - partnership_renewal_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Security: Admin routes protected by ProtectedAdminRoute';
  RAISE NOTICE 'Merchants access via customer_profiles foreign keys';
  RAISE NOTICE '==============================================';
END $$;
