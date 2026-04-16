-- CRITICAL FIX: Check and add missing enum values, then test payment update
-- Run this in Supabase SQL Editor

-- Step 1: Show current enum values
SELECT '=== Current order status enum values ===' as step;
SELECT enumlabel as "Status Value"
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname IN ('order_status', 'order_status_enum')
ORDER BY enumsortorder;

-- Step 2: Add PROCESSING if it doesn't exist
DO $$
BEGIN
    -- Try to add PROCESSING to order_status enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname IN ('order_status', 'order_status_enum')
        AND e.enumlabel = 'PROCESSING'
    ) THEN
        -- Try both possible enum names
        BEGIN
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PROCESSING';
            RAISE NOTICE '✅ Added PROCESSING to order_status';
        EXCEPTION WHEN OTHERS THEN
            ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING';
            RAISE NOTICE '✅ Added PROCESSING to order_status_enum';
        END;
    ELSE
        RAISE NOTICE '✅ PROCESSING already exists';
    END IF;
END $$;

-- Step 3: Show updated enum values
SELECT '=== Updated order status enum values ===' as step;
SELECT enumlabel as "Status Value"
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname IN ('order_status', 'order_status_enum')
ORDER BY enumsortorder;

-- Step 4: Test update on a real order
-- Replace 'YOUR_ORDER_ID' with an actual order ID from the failed payment
/*
UPDATE orders
SET
    payment_state = 'SUCCESS',
    status = 'PROCESSING',
    payment_gateway_response = jsonb_build_object(
        'test', true,
        'timestamp', NOW(),
        'message', 'Manual test update'
    ),
    updated_at = NOW()
WHERE id = 'YOUR_ORDER_ID'
RETURNING id, order_no, payment_state, status;
*/

SELECT '✅ Run complete! Now try the payment again in your app.' as result;
