-- Fix order status enum mismatch issue
-- There are TWO enum types: public.order_status and order_status_enum
-- We need to ensure both exist and have the same values

-- First, check what enum types exist
SELECT 'Existing order status enum types:' as info;
SELECT DISTINCT t.typname AS enum_name
FROM pg_type t
WHERE t.typname LIKE '%order%status%';

-- Show values for public.order_status
SELECT 'Values in public.order_status:' as info;
SELECT e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Show values for order_status_enum (if it exists)
SELECT 'Values in order_status_enum:' as info;
SELECT e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Check what type the orders.status column actually uses
SELECT
    'Current orders.status column type:' as info,
    udt_schema,
    udt_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

-- Create order_status_enum if it doesn't exist, with all the same values as public.order_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM (
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
        );
        RAISE NOTICE 'Created order_status_enum type';
    ELSE
        RAISE NOTICE 'order_status_enum already exists';
    END IF;
END $$;

-- Add missing values to order_status_enum if it exists but is incomplete
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
            BEGIN
                EXECUTE format('ALTER TYPE order_status_enum ADD VALUE %L', status_value);
                RAISE NOTICE 'Added % to order_status_enum', status_value;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add % to order_status_enum: %', status_value, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Add missing values to public.order_status if needed
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
            WHERE t.typname = 'order_status'
            AND e.enumlabel = status_value
        ) THEN
            BEGIN
                EXECUTE format('ALTER TYPE public.order_status ADD VALUE %L', status_value);
                RAISE NOTICE 'Added % to public.order_status', status_value;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add % to public.order_status: %', status_value, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Show final state
SELECT 'Final values in public.order_status:' as info;
SELECT e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

SELECT 'Final values in order_status_enum:' as info;
SELECT e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

SELECT 'Order status enums have been synchronized!' as result;
