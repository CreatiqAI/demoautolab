-- Check what values are ACTUALLY in the order_status_enum
-- This will show us if it uses uppercase or lowercase

SELECT
    'Values in order_status_enum (EXACT case):' as info,
    e.enumlabel as "Enum Value (exact case)",
    e.enumsortorder as "Sort Order"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Also check if there's a public.order_status type
SELECT
    'Values in public.order_status (if exists):' as info,
    e.enumlabel as "Enum Value (exact case)",
    e.enumsortorder as "Sort Order"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Check what the current order has
SELECT
    'Current status values in orders table:' as info,
    status,
    COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;
