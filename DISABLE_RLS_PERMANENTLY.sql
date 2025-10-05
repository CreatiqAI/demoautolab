-- ============================================
-- DISABLE RLS ON MERCHANT TABLES
-- This removes all security checks so admins can access the data
-- ============================================

-- Disable RLS on merchant_registrations
ALTER TABLE public.merchant_registrations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on merchant_codes
ALTER TABLE public.merchant_codes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on merchant_wallets
ALTER TABLE public.merchant_wallets DISABLE ROW LEVEL SECURITY;

-- Disable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT
    'RLS Status' as check,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('merchant_registrations', 'merchant_codes', 'merchant_wallets', 'wallet_transactions');

-- Test query
SELECT
    'Test query' as test,
    COUNT(*) as total_registrations
FROM merchant_registrations;

SELECT * FROM merchant_registrations ORDER BY created_at DESC;
