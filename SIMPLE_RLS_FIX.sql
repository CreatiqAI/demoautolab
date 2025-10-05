-- ============================================
-- SIMPLE RLS FIX - Just check if user exists in admin_profiles
-- This is a simpler approach that should work
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_all_for_admins" ON public.merchant_registrations;
DROP POLICY IF EXISTS "enable_own_for_customers" ON public.merchant_registrations;
DROP POLICY IF EXISTS "enable_all_for_admins" ON public.merchant_codes;
DROP POLICY IF EXISTS "enable_read_active_codes" ON public.merchant_codes;

-- For merchant_registrations: Allow if user is admin (check by phone or email)
CREATE POLICY "admins_full_access" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    -- Check if current user's phone matches any active admin
    EXISTS (
      SELECT 1
      FROM customer_profiles cp
      JOIN admin_profiles ap ON (
        ap.phone = cp.phone OR
        ap.email = cp.email OR
        ap.username = cp.username
      )
      WHERE cp.user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- For merchant_registrations: Allow customers their own
CREATE POLICY "customers_own_access" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- For merchant_codes: Allow admins
CREATE POLICY "admins_full_access" ON public.merchant_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM customer_profiles cp
      JOIN admin_profiles ap ON (
        ap.phone = cp.phone OR
        ap.email = cp.email OR
        ap.username = cp.username
      )
      WHERE cp.user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- For merchant_codes: Allow everyone to read active codes
CREATE POLICY "public_read_active" ON public.merchant_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Re-enable RLS
ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;

-- Test
SELECT
    'Test query' as test,
    COUNT(*) as visible_registrations
FROM merchant_registrations;

-- Show what matched for current user
SELECT
    'Debug: Your admin match' as info,
    cp.phone as your_phone,
    cp.email as your_email,
    cp.username as your_username,
    ap.phone as admin_phone,
    ap.email as admin_email,
    ap.username as admin_username,
    ap.is_active
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON (
    ap.phone = cp.phone OR
    ap.email = cp.email OR
    ap.username = cp.username
)
WHERE cp.user_id = auth.uid();
