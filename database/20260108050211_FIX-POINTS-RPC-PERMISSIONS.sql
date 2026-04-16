-- Fix Points & Rewards RPC Function Permissions
-- Ensure all points-related RPC functions exist and have proper permissions

-- Step 1: Verify the functions exist
SELECT '=== Checking Points RPC Functions ===' as step;
SELECT
    p.proname as "Function Name",
    pg_get_function_arguments(p.oid) as "Arguments",
    pg_get_function_result(p.oid) as "Return Type"
FROM pg_proc p
WHERE p.proname IN (
    'get_customer_points_balance',
    'get_customer_lifetime_points',
    'get_customer_points_redeemed'
)
ORDER BY p.proname;

-- Step 2: Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_customer_points_balance(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_customer_lifetime_points(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_customer_points_redeemed(UUID) TO authenticated, anon;

-- Step 3: Test the functions with a sample customer
SELECT '=== Testing Points Functions ===' as step;

-- Get a sample customer_profile ID
DO $$
DECLARE
    v_sample_customer_id UUID;
    v_balance INTEGER;
    v_lifetime INTEGER;
    v_redeemed INTEGER;
BEGIN
    -- Get first customer profile
    SELECT id INTO v_sample_customer_id
    FROM customer_profiles
    LIMIT 1;

    IF v_sample_customer_id IS NOT NULL THEN
        -- Test balance function
        v_balance := get_customer_points_balance(v_sample_customer_id);
        RAISE NOTICE 'Customer % - Current Balance: % points', v_sample_customer_id, v_balance;

        -- Test lifetime function
        v_lifetime := get_customer_lifetime_points(v_sample_customer_id);
        RAISE NOTICE 'Customer % - Lifetime Earned: % points', v_sample_customer_id, v_lifetime;

        -- Test redeemed function
        v_redeemed := get_customer_points_redeemed(v_sample_customer_id);
        RAISE NOTICE 'Customer % - Total Redeemed: % points', v_sample_customer_id, v_redeemed;
    ELSE
        RAISE NOTICE 'No customer profiles found in database';
    END IF;
END $$;

-- Step 4: Show all points in ledger grouped by customer
SELECT '=== Current Points by Customer ===' as step;
SELECT
    cp.id as customer_id,
    cp.full_name,
    cp.email,
    COALESCE(SUM(CASE WHEN cpl.transaction_type = 'EARNED' THEN cpl.points_amount ELSE 0 END), 0) as lifetime_earned,
    COALESCE(SUM(CASE WHEN cpl.transaction_type = 'REDEEMED' THEN cpl.points_amount ELSE 0 END), 0) as total_redeemed,
    COALESCE(SUM(cpl.points_amount), 0) as current_balance
FROM customer_profiles cp
LEFT JOIN customer_points_ledger cpl ON cpl.customer_id = cp.id
GROUP BY cp.id, cp.full_name, cp.email
ORDER BY current_balance DESC;

SELECT '✅ Permissions granted and functions tested!' as result;
