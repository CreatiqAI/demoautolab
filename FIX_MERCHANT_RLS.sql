-- ============================================
-- FIX MERCHANT RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- First, let's check current admin user
SELECT
    'Current Admin Check' as info,
    cp.id as customer_profile_id,
    cp.user_id,
    cp.username,
    ap.id as admin_profile_id,
    ap.username as admin_username,
    ap.is_active
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_manage_all_registrations" ON public.merchant_registrations;
DROP POLICY IF EXISTS "customers_manage_own_registration" ON public.merchant_registrations;

-- Create new admin policy that works
CREATE POLICY "admin_can_view_all_registrations" ON public.merchant_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      JOIN public.customer_profiles cp ON cp.username = ap.username
      WHERE cp.user_id = auth.uid() AND ap.is_active = true
    )
  );

CREATE POLICY "admin_can_manage_registrations" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      JOIN public.customer_profiles cp ON cp.username = ap.username
      WHERE cp.user_id = auth.uid() AND ap.is_active = true
    )
  );

-- Allow customers to manage their own registration
CREATE POLICY "customers_manage_own_registration" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = merchant_registrations.customer_id
      AND cp.user_id = auth.uid()
    )
  );

-- Fix merchant_codes policies
DROP POLICY IF EXISTS "admin_manage_merchant_codes" ON public.merchant_codes;
DROP POLICY IF EXISTS "merchants_view_active_codes" ON public.merchant_codes;

CREATE POLICY "admin_manage_merchant_codes" ON public.merchant_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      JOIN public.customer_profiles cp ON cp.username = ap.username
      WHERE cp.user_id = auth.uid() AND ap.is_active = true
    )
  );

CREATE POLICY "anyone_view_active_codes" ON public.merchant_codes
  FOR SELECT USING (is_active = true);

-- Fix merchant_wallets policies
DROP POLICY IF EXISTS "admin_manage_wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "customers_view_own_wallet" ON public.merchant_wallets;

CREATE POLICY "admin_manage_wallets" ON public.merchant_wallets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      JOIN public.customer_profiles cp ON cp.username = ap.username
      WHERE cp.user_id = auth.uid() AND ap.is_active = true
    )
  );

CREATE POLICY "customers_view_own_wallet" ON public.merchant_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = merchant_wallets.customer_id
      AND cp.user_id = auth.uid()
    )
  );

-- Fix wallet_transactions policies
DROP POLICY IF EXISTS "admin_manage_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "customers_view_own_transactions" ON public.wallet_transactions;

CREATE POLICY "admin_manage_transactions" ON public.wallet_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      JOIN public.customer_profiles cp ON cp.username = ap.username
      WHERE cp.user_id = auth.uid() AND ap.is_active = true
    )
  );

CREATE POLICY "customers_view_own_transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = wallet_transactions.customer_id
      AND cp.user_id = auth.uid()
    )
  );

-- Verify policies are created
SELECT
    '=== VERIFICATION: RLS Policies ===' as info,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('merchant_registrations', 'merchant_codes', 'merchant_wallets', 'wallet_transactions')
ORDER BY tablename, policyname;

-- Test query as current user
SELECT
    '=== TEST: Can current user see merchant_registrations? ===' as info,
    COUNT(*) as total_registrations
FROM merchant_registrations;

RAISE NOTICE '✅ RLS policies updated! Refresh your admin dashboard to see merchant applications.';
