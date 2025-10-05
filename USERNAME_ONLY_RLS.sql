-- ============================================
-- USERNAME ONLY RLS FIX
-- Only checks username match between customer_profiles and admin_profiles
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "admins_full_access" ON public.merchant_registrations;
DROP POLICY IF EXISTS "customers_own_access" ON public.merchant_registrations;
DROP POLICY IF EXISTS "admins_full_access" ON public.merchant_codes;
DROP POLICY IF EXISTS "public_read_active" ON public.merchant_codes;
DROP POLICY IF EXISTS "enable_all_for_admins" ON public.merchant_registrations;
DROP POLICY IF EXISTS "enable_own_for_customers" ON public.merchant_registrations;
DROP POLICY IF EXISTS "enable_all_for_admins" ON public.merchant_codes;
DROP POLICY IF EXISTS "enable_read_active_codes" ON public.merchant_codes;

-- MERCHANT_REGISTRATIONS: Admins get full access
CREATE POLICY "admin_all_access" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM customer_profiles cp
      JOIN admin_profiles ap ON ap.username = cp.username
      WHERE cp.user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- MERCHANT_REGISTRATIONS: Customers can manage their own
CREATE POLICY "customer_own_access" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- MERCHANT_CODES: Admins get full access
CREATE POLICY "admin_all_access" ON public.merchant_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM customer_profiles cp
      JOIN admin_profiles ap ON ap.username = cp.username
      WHERE cp.user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- MERCHANT_CODES: Everyone can view active codes
CREATE POLICY "anyone_read_active" ON public.merchant_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Re-enable RLS
ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;

-- Debug: Check if your username matches
SELECT
    'Username match check' as info,
    cp.username as customer_username,
    ap.username as admin_username,
    CASE
        WHEN cp.username IS NULL THEN 'ERROR: customer_profiles.username is NULL'
        WHEN ap.username IS NULL THEN 'ERROR: No matching admin found'
        WHEN cp.username = ap.username THEN 'SUCCESS: Usernames match!'
        ELSE 'ERROR: Usernames do not match'
    END as match_status,
    ap.is_active as admin_is_active
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();

-- Test query
SELECT
    'Test after RLS' as test,
    COUNT(*) as visible_registrations
FROM merchant_registrations;

-- If test shows 0, your customer_profiles.username is probably NULL
-- Run this to check:
SELECT
    'Your customer profile' as info,
    id,
    user_id,
    username,
    full_name,
    phone
FROM customer_profiles
WHERE user_id = auth.uid();
