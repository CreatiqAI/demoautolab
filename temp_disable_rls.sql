-- ============================================
-- TEMPORARY: Disable RLS on merchant tables for testing
-- WARNING: This removes all security. Only use for debugging!
-- ============================================

-- Disable RLS on merchant_registrations temporarily
ALTER TABLE public.merchant_registrations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on merchant_codes temporarily
ALTER TABLE public.merchant_codes DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT
    'After disabling RLS' as test,
    COUNT(*) as total_registrations
FROM merchant_registrations;

SELECT * FROM merchant_registrations ORDER BY created_at DESC;

-- NOTE: After testing, re-enable with:
-- ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;
