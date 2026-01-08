-- Ensure DELIVERED status exists in order_status_enum
-- This fixes the reactivate order functionality

-- Check current enum values
SELECT 'Current order_status_enum values:' as info;
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Add DELIVERED to the enum if it doesn't exist
DO $$
BEGIN
    -- Check if DELIVERED already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'DELIVERED'
    ) THEN
        -- Add DELIVERED to the enum
        ALTER TYPE order_status_enum ADD VALUE 'DELIVERED';
        RAISE NOTICE 'Added DELIVERED to order_status_enum';
    ELSE
        RAISE NOTICE 'DELIVERED already exists in order_status_enum';
    END IF;
END $$;

-- Add other common statuses if they don't exist
DO $$
DECLARE
    status_value TEXT;
    status_list TEXT[] := ARRAY[
        'PENDING_PAYMENT',
        'PAYMENT_PROCESSING',
        'PAYMENT_FAILED',
        'PENDING_PAYMENT_VERIFICATION',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED',
        'PLACED',
        'PROCESSING',
        'PENDING_VERIFICATION',
        'VERIFIED',
        'PACKING',
        'DISPATCHED',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED'
    ];
BEGIN
    FOREACH status_value IN ARRAY status_list
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'order_status_enum'
            AND e.enumlabel = status_value
        ) THEN
            EXECUTE format('ALTER TYPE order_status_enum ADD VALUE %L', status_value);
            RAISE NOTICE 'Added % to order_status_enum', status_value;
        END IF;
    END LOOP;
END $$;

-- Verify all statuses are now in the enum
SELECT 'Updated order_status_enum values:' as info;
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

SELECT 'Order status enum has been updated successfully!' as result;
