-- Add PROCESSING status to the order status enum
-- This is needed for payment processing workflow

-- Step 1: Check which enum type is actually used
SELECT '=== Checking enum types ===' as step;
SELECT t.typname as "Enum Type Name"
FROM pg_type t
WHERE t.typname IN ('order_status', 'order_status_enum')
ORDER BY t.typname;

-- Step 2: Show current values
SELECT '=== Current enum values ===' as step;
SELECT
    t.typname as "Enum Name",
    e.enumlabel as "Status Value",
    e.enumsortorder as "Order"
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname IN ('order_status', 'order_status_enum')
ORDER BY t.typname, e.enumsortorder;

-- Step 3: Add PROCESSING to the enum (whichever exists)
DO $$
DECLARE
    v_enum_name TEXT;
BEGIN
    -- Find which enum type exists
    SELECT t.typname INTO v_enum_name
    FROM pg_type t
    WHERE t.typname IN ('order_status', 'order_status_enum')
    LIMIT 1;

    IF v_enum_name IS NULL THEN
        RAISE EXCEPTION 'Neither order_status nor order_status_enum enum type found!';
    END IF;

    RAISE NOTICE 'Found enum type: %', v_enum_name;

    -- Check if PROCESSING already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = v_enum_name
        AND e.enumlabel = 'PROCESSING'
    ) THEN
        -- Add PROCESSING to the enum
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', v_enum_name, 'PROCESSING');
        RAISE NOTICE '✅ Successfully added PROCESSING to % enum', v_enum_name;
    ELSE
        RAISE NOTICE '✅ PROCESSING already exists in % enum', v_enum_name;
    END IF;
END $$;

-- Step 4: Verify PROCESSING was added
SELECT '=== Updated enum values (should include PROCESSING) ===' as step;
SELECT
    t.typname as "Enum Name",
    e.enumlabel as "Status Value",
    e.enumsortorder as "Order"
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname IN ('order_status', 'order_status_enum')
ORDER BY t.typname, e.enumsortorder;

-- Step 5: Test that PROCESSING can be used
SELECT '=== Testing PROCESSING status ===' as step;
DO $$
DECLARE
    v_test_status TEXT := 'PROCESSING';
BEGIN
    -- This will throw an error if PROCESSING is not valid
    PERFORM v_test_status::order_status;
    RAISE NOTICE '✅ PROCESSING is a valid order_status value';
EXCEPTION
    WHEN OTHERS THEN
        -- Try the other enum name
        BEGIN
            PERFORM v_test_status::order_status_enum;
            RAISE NOTICE '✅ PROCESSING is a valid order_status_enum value';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION '❌ PROCESSING is not valid in either enum type: %', SQLERRM;
        END;
END $$;

SELECT '✅ PROCESSING status is now available! You can now use it in orders.' as result;
