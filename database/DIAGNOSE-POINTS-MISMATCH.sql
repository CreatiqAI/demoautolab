-- Diagnose Points Mismatch Issue
-- This will show us what's in the customer_points_ledger and why admin sees 0

-- Step 1: Show all points in the ledger
SELECT '=== All Points in Ledger ===' as step;
SELECT
    id,
    customer_id,
    transaction_type,
    points_amount,
    order_id,
    description,
    created_at
FROM customer_points_ledger
ORDER BY created_at DESC
LIMIT 20;

-- Step 2: Show customer profiles
SELECT '=== Customer Profiles ===' as step;
SELECT
    id as customer_profile_id,
    user_id,
    full_name,
    email
FROM customer_profiles
ORDER BY created_at DESC;

-- Step 3: Check if customer_id in ledger matches customer_profiles.id
SELECT '=== Points Ledger with Customer Info ===' as step;
SELECT
    cpl.id as ledger_id,
    cpl.customer_id,
    cp.id as profile_id,
    cp.full_name,
    cp.email,
    cpl.transaction_type,
    cpl.points_amount,
    cpl.description,
    CASE
        WHEN cpl.customer_id = cp.id THEN '✅ MATCH'
        ELSE '❌ NO MATCH'
    END as id_match_status
FROM customer_points_ledger cpl
LEFT JOIN customer_profiles cp ON cpl.customer_id = cp.id
ORDER BY cpl.created_at DESC;

-- Step 4: Check if customer_id in ledger matches user_id instead
SELECT '=== Checking if customer_id matches user_id ===' as step;
SELECT
    cpl.id as ledger_id,
    cpl.customer_id,
    cp.id as profile_id,
    cp.user_id,
    cp.full_name,
    cpl.points_amount,
    CASE
        WHEN cpl.customer_id = cp.user_id THEN '⚠️ STORED AS USER_ID (WRONG)'
        WHEN cpl.customer_id = cp.id THEN '✅ STORED AS PROFILE_ID (CORRECT)'
        ELSE '❌ NO MATCH AT ALL'
    END as id_type
FROM customer_points_ledger cpl
LEFT JOIN customer_profiles cp ON cpl.customer_id = cp.user_id OR cpl.customer_id = cp.id
ORDER BY cpl.created_at DESC;

-- Step 5: Calculate actual points by customer_id
SELECT '=== Actual Points in Ledger Grouped by customer_id ===' as step;
SELECT
    cpl.customer_id,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN cpl.transaction_type = 'EARNED' THEN cpl.points_amount ELSE 0 END) as total_earned,
    SUM(cpl.points_amount) as current_balance,
    STRING_AGG(DISTINCT cpl.description, ', ') as descriptions
FROM customer_points_ledger cpl
GROUP BY cpl.customer_id;

-- Step 6: Try to match with both user_id and profile_id
SELECT '=== Points Summary with Proper Matching ===' as step;
SELECT
    cp.id as profile_id,
    cp.user_id,
    cp.full_name,
    cp.email,
    COALESCE(SUM(CASE WHEN cpl1.transaction_type = 'EARNED' THEN cpl1.points_amount ELSE 0 END), 0) as earned_via_profile_id,
    COALESCE(SUM(CASE WHEN cpl2.transaction_type = 'EARNED' THEN cpl2.points_amount ELSE 0 END), 0) as earned_via_user_id
FROM customer_profiles cp
LEFT JOIN customer_points_ledger cpl1 ON cpl1.customer_id = cp.id
LEFT JOIN customer_points_ledger cpl2 ON cpl2.customer_id = cp.user_id
GROUP BY cp.id, cp.user_id, cp.full_name, cp.email
ORDER BY earned_via_profile_id DESC, earned_via_user_id DESC;

SELECT '✅ Diagnostic complete! Check which ID type has the points.' as result;
