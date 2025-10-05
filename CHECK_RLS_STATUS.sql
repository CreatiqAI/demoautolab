-- Check if RLS is enabled on merchant tables
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('merchant_registrations', 'merchant_codes');

-- Check what policies exist
SELECT
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('merchant_registrations', 'merchant_codes')
ORDER BY tablename, policyname;

-- Test direct query
SELECT COUNT(*) as total FROM merchant_registrations;

-- Check if your current user can see the data
SELECT
    'Your admin check' as test,
    cp.id,
    cp.username as customer_username,
    ap.username as admin_username,
    ap.is_active
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();
