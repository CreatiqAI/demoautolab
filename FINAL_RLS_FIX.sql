-- ============================================
-- FINAL RLS FIX - Allow admins to access merchant tables
-- ============================================

-- First check your admin username
SELECT
    'Your admin info' as check,
    cp.username as customer_username,
    ap.username as admin_username,
    ap.is_active as is_admin_active,
    cp.user_id
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();

-- Drop all existing policies on merchant tables
DROP POLICY IF EXISTS "admin_can_view_all_registrations" ON public.merchant_registrations;
DROP POLICY IF EXISTS "admin_can_manage_registrations" ON public.merchant_registrations;
DROP POLICY IF EXISTS "customers_manage_own_registration" ON public.merchant_registrations;
DROP POLICY IF EXISTS "admin_manage_merchant_codes" ON public.merchant_codes;
DROP POLICY IF EXISTS "anyone_view_active_codes" ON public.merchant_codes;

-- MERCHANT_REGISTRATIONS: Allow admins full access
CREATE POLICY "enable_all_for_admins" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.username IN (
        SELECT username FROM customer_profiles WHERE user_id = auth.uid()
      )
      AND ap.is_active = true
    )
  );

-- MERCHANT_REGISTRATIONS: Allow customers to view/manage their own
CREATE POLICY "enable_own_for_customers" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- MERCHANT_CODES: Allow admins full access
CREATE POLICY "enable_all_for_admins" ON public.merchant_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.username IN (
        SELECT username FROM customer_profiles WHERE user_id = auth.uid()
      )
      AND ap.is_active = true
    )
  );

-- MERCHANT_CODES: Allow everyone to view active codes
CREATE POLICY "enable_read_active_codes" ON public.merchant_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Re-enable RLS
ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;

-- Test the policies
SELECT
    'Test after RLS fix' as test,
    COUNT(*) as visible_registrations
FROM merchant_registrations;

-- Show all policies
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('merchant_registrations', 'merchant_codes')
ORDER BY tablename, policyname;
