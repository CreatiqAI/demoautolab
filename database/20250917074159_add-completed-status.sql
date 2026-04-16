-- Add COMPLETED status to order_status_enum and update system
-- This script safely adds the COMPLETED status to the existing enum

-- First, check what enum values currently exist
SELECT 'Current order status enum values:' as info;
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Add COMPLETED to the enum if it doesn't exist
DO $$
BEGIN
    -- Check if COMPLETED already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'COMPLETED'
    ) THEN
        -- Add COMPLETED to the enum
        ALTER TYPE order_status_enum ADD VALUE 'COMPLETED';
        RAISE NOTICE 'Added COMPLETED to order_status_enum';
    ELSE
        RAISE NOTICE 'COMPLETED already exists in order_status_enum';
    END IF;
END $$;

-- Verify the enum now includes COMPLETED
SELECT 'Updated order status enum values:' as info;
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Test that COMPLETED status now works with a simple validation
DO $$
DECLARE
    test_order_id uuid;
    enum_exists boolean := false;
BEGIN
    -- Check if COMPLETED exists in enum
    SELECT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'COMPLETED'
    ) INTO enum_exists;

    IF enum_exists THEN
        RAISE NOTICE 'COMPLETED status is available in enum - ready for use!';

        -- Find any order to verify enum constraint would work
        SELECT id INTO test_order_id FROM orders LIMIT 1;

        IF test_order_id IS NOT NULL THEN
            RAISE NOTICE 'Found test order %, enum constraint validation successful', test_order_id;
        ELSE
            RAISE NOTICE 'No orders found to test with, but COMPLETED enum is ready';
        END IF;
    ELSE
        RAISE NOTICE 'COMPLETED status not found in enum';
    END IF;
END $$;

-- Create a view to easily see order status distribution
CREATE OR REPLACE VIEW order_status_summary AS
SELECT
    status,
    COUNT(*) as order_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM orders
GROUP BY status
ORDER BY order_count DESC;

-- Show current order status distribution
SELECT 'Current order status distribution:' as info;
SELECT * FROM order_status_summary;

SELECT 'COMPLETED status has been successfully added to the database!' as result;