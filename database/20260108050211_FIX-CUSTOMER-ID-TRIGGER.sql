-- Fix the customer_id trigger issue
-- The error "record 'new' has no field 'customer_id'" means there's a trigger trying to access a non-existent column

-- Step 1: Find all triggers on the orders table
SELECT '=== All triggers on orders table ===' as step;
SELECT
    tgname as trigger_name,
    proname as function_name,
    pg_get_triggerdef(pg_trigger.oid) as trigger_definition
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE pg_class.relname = 'orders'
AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY tgname;

-- Step 2: Check if customer_id column exists in orders table
SELECT '=== Checking if customer_id column exists ===' as step;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'customer_id';

-- Step 3: Show the actual columns in orders table
SELECT '=== Actual columns in orders table ===' as step;
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Step 4: Find and show the problematic trigger function
SELECT '=== Looking for trigger functions that reference customer_id ===' as step;
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE pg_get_functiondef(p.oid) ILIKE '%customer_id%'
AND p.proname LIKE '%order%'
OR p.proname LIKE '%customer%';

-- Step 5: Disable the problematic trigger temporarily (if found)
-- We'll identify it from the output above and fix it properly

SELECT '✅ Diagnostic complete! Check the output above to identify the problematic trigger.' as result;
