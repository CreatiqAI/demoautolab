-- Test RPC Functions Directly
-- This will test if the functions return the correct values

-- Test with Ming Shun's customer_profile_id (acc2ce9f-90b9-4974-a934-683e25dbc2d8)
SELECT '=== Testing RPC Functions with Ming Shun ID ===' as step;

-- Test balance function
SELECT 'Balance:' as test, get_customer_points_balance('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;

-- Test lifetime function
SELECT 'Lifetime:' as test, get_customer_lifetime_points('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;

-- Test redeemed function
SELECT 'Redeemed:' as test, get_customer_points_redeemed('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;

-- Manual calculation to verify
SELECT '=== Manual Calculation ===' as step;
SELECT
    'Manual Balance' as calculation,
    COALESCE(SUM(points_amount), 0) as result
FROM customer_points_ledger
WHERE customer_id = 'acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid
  AND (expires_at IS NULL OR expires_at > NOW());

SELECT
    'Manual Lifetime' as calculation,
    COALESCE(SUM(points_amount), 0) as result
FROM customer_points_ledger
WHERE customer_id = 'acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid
  AND transaction_type = 'EARNED';

-- Check if functions exist
SELECT '=== Checking if RPC Functions Exist ===' as step;
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as source_code_preview
FROM pg_proc p
WHERE p.proname IN (
    'get_customer_points_balance',
    'get_customer_lifetime_points',
    'get_customer_points_redeemed'
)
ORDER BY p.proname;
