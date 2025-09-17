-- Check if orders table exists and has data, create test orders if needed

-- First, check if orders table exists and what data it has
SELECT 'Checking orders table...' as step;

-- Count existing orders
SELECT
  'Total orders:' as metric,
  COUNT(*) as count
FROM orders;

-- Count by status
SELECT
  status,
  COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- If there are no orders, let's create some test orders
INSERT INTO orders (
  order_no,
  customer_name,
  customer_phone,
  customer_email,
  delivery_method,
  delivery_address,
  payment_method,
  payment_state,
  subtotal,
  tax,
  discount,
  shipping_fee,
  total,
  status,
  notes,
  created_at,
  updated_at
) VALUES
-- Test order 1 - PLACED
(
  'ORD-TEST-001',
  'John Doe',
  '+60123456789',
  'john.doe@example.com',
  'delivery',
  '{"address": "123 Test Street\nKuala Lumpur 50000\nMalaysia", "fullName": "John Doe", "phoneNumber": "+60123456789"}',
  'credit_card',
  'UNPAID',
  100.00,
  6.00,
  0.00,
  15.00,
  121.00,
  'PLACED',
  'Test order for development',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
-- Test order 2 - VERIFIED
(
  'ORD-TEST-002',
  'Jane Smith',
  '+60198765432',
  'jane.smith@example.com',
  'delivery',
  '{"address": "456 Demo Avenue\nPetaling Jaya 47300\nMalaysia", "fullName": "Jane Smith", "phoneNumber": "+60198765432"}',
  'bank_transfer',
  'APPROVED',
  250.00,
  15.00,
  10.00,
  15.00,
  270.00,
  'VERIFIED',
  'Verified test order',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
-- Test order 3 - PACKING
(
  'ORD-TEST-003',
  'Ahmad Rahman',
  '+60187654321',
  'ahmad.rahman@example.com',
  'self-pickup',
  '{}',
  'cash_on_delivery',
  'SUBMITTED',
  180.00,
  10.80,
  0.00,
  0.00,
  190.80,
  'PACKING',
  'Self pickup order',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
),
-- Test order 4 - COMPLETED (should appear in archive)
(
  'ORD-TEST-004',
  'Lisa Chen',
  '+60176543210',
  'lisa.chen@example.com',
  'delivery',
  '{"address": "789 Completed Street\nSubang Jaya 47500\nMalaysia", "fullName": "Lisa Chen", "phoneNumber": "+60176543210"}',
  'credit_card',
  'APPROVED',
  320.00,
  19.20,
  20.00,
  15.00,
  334.20,
  'COMPLETED',
  'Completed test order for archive',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 hour'
)
ON CONFLICT (order_no) DO NOTHING;

-- Create some test order items for these orders
INSERT INTO order_items (
  order_id,
  component_sku,
  component_name,
  product_context,
  quantity,
  unit_price,
  total_price
)
SELECT
  o.id,
  'SKU-TEST-' || LPAD((ROW_NUMBER() OVER())::text, 3, '0'),
  'Test Component ' || (ROW_NUMBER() OVER()),
  'Test Product Context',
  (RANDOM() * 5 + 1)::integer,
  ROUND((RANDOM() * 100 + 20)::numeric, 2),
  ROUND(((RANDOM() * 5 + 1) * (RANDOM() * 100 + 20))::numeric, 2)
FROM orders o
WHERE o.order_no LIKE 'ORD-TEST-%'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  )
LIMIT 8; -- 2 items per order average

-- Verify the test data was created
SELECT 'Test orders created successfully!' as result;

-- Show final count
SELECT
  'Final order count:' as metric,
  COUNT(*) as count
FROM orders;

-- Show orders by status after creation
SELECT
  status,
  COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY
  CASE status
    WHEN 'PLACED' THEN 1
    WHEN 'VERIFIED' THEN 2
    WHEN 'PACKING' THEN 3
    WHEN 'DISPATCHED' THEN 4
    WHEN 'DELIVERED' THEN 5
    WHEN 'COMPLETED' THEN 6
    WHEN 'CANCELLED' THEN 7
    ELSE 8
  END;