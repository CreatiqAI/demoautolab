-- Check RLS policies on merchant tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('merchant_registrations', 'merchant_codes', 'customer_profiles')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('merchant_registrations', 'merchant_codes', 'customer_profiles');
