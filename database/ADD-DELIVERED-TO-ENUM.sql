-- Add DELIVERED to order_status_enum
-- This is the FINAL fix - we know COMPLETED works, so we just need to add DELIVERED

-- Check if DELIVERED exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'DELIVERED'
    ) THEN
        -- DELIVERED doesn't exist, add it
        ALTER TYPE order_status_enum ADD VALUE 'DELIVERED';
        RAISE NOTICE '✅ Successfully added DELIVERED to order_status_enum';
    ELSE
        RAISE NOTICE '✅ DELIVERED already exists in order_status_enum';
    END IF;
END $$;

-- Show all current enum values
SELECT '=== Current enum values ===' as info;
SELECT e.enumlabel as "Status Value"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;
