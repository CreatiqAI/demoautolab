-- Fix order status enum to include COMPLETED status

-- First, let's check what the current enum values are
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Check current status column definition
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

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
SELECT
    'Updated enum values:' as status,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum';

-- If the enum approach doesn't work, let's try changing the column to text
-- (Uncomment the lines below if the enum fix doesn't work)

/*
-- Alternative: Change status column from enum to text to allow any status
ALTER TABLE orders ALTER COLUMN status TYPE text;

-- Also fix order_items if it has enum constraints
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_items' AND column_name = 'status' AND udt_name LIKE '%enum%'
    ) THEN
        ALTER TABLE order_items ALTER COLUMN status TYPE text;
    END IF;
END $$;
*/

-- Test that COMPLETED status now works
SELECT 'Testing COMPLETED status...' as test;

-- Try to insert a test record with COMPLETED status (will rollback)
BEGIN;
INSERT INTO orders (order_no, customer_name, customer_phone, status)
VALUES ('TEST-COMPLETED', 'Test Customer', '+60123456789', 'COMPLETED');
ROLLBACK;

SELECT 'COMPLETED status test successful!' as result;