-- Check the specific order that's failing
-- Replace the ID with your actual order ID: 2d834fdb-40df-4926-94fd-207e75946936

SELECT
    '=== Order Details ===' as info,
    id,
    order_no,
    status,
    pg_typeof(status) as "status_column_type",
    updated_at
FROM orders
WHERE id = '2d834fdb-40df-4926-94fd-207e75946936';

-- Try to manually update this order
-- This will tell us if it's a database-level issue
UPDATE orders
SET status = 'PROCESSING',
    updated_at = NOW()
WHERE id = '2d834fdb-40df-4926-94fd-207e75946936'
RETURNING id, order_no, status;
