-- ============================================
-- FINAL WORKING RLS POLICIES FOR MERCHANT SYSTEM
-- These policies work when queries run AFTER authentication
-- ============================================

-- Clean up old policies
DROP POLICY IF EXISTS "admin_all_access" ON public.merchant_registrations;
DROP POLICY IF EXISTS "customer_own_access" ON public.merchant_registrations;
DROP POLICY IF EXISTS "admin_all_access" ON public.merchant_codes;
DROP POLICY IF EXISTS "anyone_read_active" ON public.merchant_codes;

-- MERCHANT_REGISTRATIONS: Allow admins full access
CREATE POLICY "admin_full_access" ON public.merchant_registrations
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

-- MERCHANT_REGISTRATIONS: Allow customers to manage their own
CREATE POLICY "customer_own_registration" ON public.merchant_registrations
  FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- MERCHANT_CODES: Allow admins full access
CREATE POLICY "admin_full_access" ON public.merchant_codes
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

-- MERCHANT_CODES: Allow everyone to view active codes (for registration)
CREATE POLICY "public_view_active" ON public.merchant_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Enable RLS
ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT
    'RLS Policies Created' as status,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('merchant_registrations', 'merchant_codes')
ORDER BY tablename, policyname;
