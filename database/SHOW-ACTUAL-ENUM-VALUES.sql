-- THIS WILL SHOW YOU THE ACTUAL ENUM VALUES IN YOUR DATABASE
-- Copy and paste this into Supabase SQL Editor and share the results

-- Show ALL enum values in order_status_enum
SELECT
    '=== order_status_enum values ===' as section,
    e.enumlabel as "Actual Enum Value",
    e.enumsortorder as "Order"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Show what status values are actually being used in the orders table
SELECT
    '=== Status values currently in orders table ===' as section,
    status as "Current Status Values",
    COUNT(*) as "Count"
FROM orders
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Show the column definition
SELECT
    '=== orders.status column info ===' as section,
    column_name,
    data_type,
    udt_name as "Actual Type Name",
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
