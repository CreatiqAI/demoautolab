-- Test script to verify order archiving functionality works
-- This script creates test orders with different statuses and tests the archiving flow

-- Check current orders count
SELECT 'Current orders by status:' as info;
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Create a test order with PLACED status (should appear in active orders)
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
) VALUES (
  'TEST-ARCHIVE-001',
  'Test Archive Customer',
  '+60123456789',
  'test.archive@example.com',
  'delivery',
  '{"address": "123 Archive Test Street\nKuala Lumpur 50000\nMalaysia", "fullName": "Test Archive Customer", "phoneNumber": "+60123456789"}',
  'credit_card',
  'APPROVED',
  150.00,
  9.00,
  0.00,
  15.00,
  174.00,
  'PLACED',
  'Test order for archive functionality',
  NOW(),
  NOW()
) ON CONFLICT (order_no) DO UPDATE SET
  updated_at = NOW(),
  status = 'PLACED';

-- Create a test order with DELIVERED status (should appear in archived orders)
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
) VALUES (
  'TEST-ARCHIVE-002',
  'Test Archived Customer',
  '+60198765432',
  'test.archived@example.com',
  'delivery',
  '{"address": "456 Archived Test Avenue\nPetaling Jaya 47300\nMalaysia", "fullName": "Test Archived Customer", "phoneNumber": "+60198765432"}',
  'bank_transfer',
  'APPROVED',
  200.00,
  12.00,
  10.00,
  15.00,
  217.00,
  'DELIVERED',
  'Test order that should appear in archived orders',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (order_no) DO UPDATE SET
  updated_at = NOW() - INTERVAL '1 hour',
  status = 'DELIVERED';

-- Add test order items for both orders
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
  'TEST-SKU-' || o.order_no,
  'Test Component for ' || o.order_no,
  'Test Product Context',
  2,
  75.00,
  150.00
FROM orders o
WHERE o.order_no IN ('TEST-ARCHIVE-001', 'TEST-ARCHIVE-002')
AND NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
);

-- Show final status after test data creation
SELECT 'Orders after test data creation:' as info;
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY
  CASE status
    WHEN 'PLACED' THEN 1
    WHEN 'VERIFIED' THEN 2
    WHEN 'PACKING' THEN 3
    WHEN 'DISPATCHED' THEN 4
    WHEN 'DELIVERED' THEN 5
    WHEN 'CANCELLED' THEN 6
    ELSE 7
  END;

-- Show test orders specifically
SELECT 'Test orders created:' as info;
SELECT order_no, customer_name, status, created_at, updated_at
FROM orders
WHERE order_no LIKE 'TEST-ARCHIVE-%'
ORDER BY order_no;

SELECT 'Archive functionality test setup complete!' as result;