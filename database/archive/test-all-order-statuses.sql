-- Test script to create orders with all possible statuses for testing the status filter

-- Clean up any existing test orders first (optional)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE order_no LIKE 'STATUS-TEST-%'
);
DELETE FROM orders WHERE order_no LIKE 'STATUS-TEST-%';

-- Create test orders with all different statuses
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
-- Payment-related statuses
(
  'STATUS-TEST-001',
  'Pending Payment Customer',
  '+60123000001',
  'pending.payment@test.com',
  'delivery',
  '{"address": "Test Address 1", "fullName": "Pending Payment Customer", "phoneNumber": "+60123000001"}',
  'credit_card',
  'UNPAID',
  100.00, 6.00, 0.00, 15.00, 121.00,
  'PENDING_PAYMENT',
  'Test order with PENDING_PAYMENT status',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),
(
  'STATUS-TEST-002',
  'Payment Processing Customer',
  '+60123000002',
  'processing@test.com',
  'delivery',
  '{"address": "Test Address 2", "fullName": "Payment Processing Customer", "phoneNumber": "+60123000002"}',
  'bank_transfer',
  'SUBMITTED',
  150.00, 9.00, 0.00, 15.00, 174.00,
  'PAYMENT_PROCESSING',
  'Test order with PAYMENT_PROCESSING status',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),
(
  'STATUS-TEST-003',
  'Payment Failed Customer',
  '+60123000003',
  'failed@test.com',
  'delivery',
  '{"address": "Test Address 3", "fullName": "Payment Failed Customer", "phoneNumber": "+60123000003"}',
  'credit_card',
  'REJECTED',
  200.00, 12.00, 0.00, 15.00, 227.00,
  'PAYMENT_FAILED',
  'Test order with PAYMENT_FAILED status',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
),
(
  'STATUS-TEST-004',
  'Payment Verification Customer',
  '+60123000004',
  'verification@test.com',
  'delivery',
  '{"address": "Test Address 4", "fullName": "Payment Verification Customer", "phoneNumber": "+60123000004"}',
  'bank_transfer',
  'SUBMITTED',
  180.00, 10.80, 0.00, 15.00, 205.80,
  'PENDING_PAYMENT_VERIFICATION',
  'Test order with PENDING_PAYMENT_VERIFICATION status',
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '4 hours'
),
(
  'STATUS-TEST-005',
  'Payment Verified Customer',
  '+60123000005',
  'verified@test.com',
  'delivery',
  '{"address": "Test Address 5", "fullName": "Payment Verified Customer", "phoneNumber": "+60123000005"}',
  'credit_card',
  'APPROVED',
  220.00, 13.20, 0.00, 15.00, 248.20,
  'PAYMENT_VERIFIED',
  'Test order with PAYMENT_VERIFIED status',
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '5 hours'
),
(
  'STATUS-TEST-006',
  'Payment Rejected Customer',
  '+60123000006',
  'rejected@test.com',
  'delivery',
  '{"address": "Test Address 6", "fullName": "Payment Rejected Customer", "phoneNumber": "+60123000006"}',
  'bank_transfer',
  'REJECTED',
  250.00, 15.00, 0.00, 15.00, 280.00,
  'PAYMENT_REJECTED',
  'Test order with PAYMENT_REJECTED status',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
),

-- Order processing statuses
(
  'STATUS-TEST-007',
  'Placed Customer',
  '+60123000007',
  'placed@test.com',
  'delivery',
  '{"address": "Test Address 7", "fullName": "Placed Customer", "phoneNumber": "+60123000007"}',
  'credit_card',
  'APPROVED',
  300.00, 18.00, 10.00, 15.00, 323.00,
  'PLACED',
  'Test order with PLACED status',
  NOW() - INTERVAL '7 hours',
  NOW() - INTERVAL '7 hours'
),
(
  'STATUS-TEST-008',
  'Processing Customer',
  '+60123000008',
  'processing.order@test.com',
  'delivery',
  '{"address": "Test Address 8", "fullName": "Processing Customer", "phoneNumber": "+60123000008"}',
  'bank_transfer',
  'APPROVED',
  120.00, 7.20, 0.00, 15.00, 142.20,
  'PROCESSING',
  'Test order with PROCESSING status',
  NOW() - INTERVAL '8 hours',
  NOW() - INTERVAL '8 hours'
),
(
  'STATUS-TEST-009',
  'Verification Pending Customer',
  '+60123000009',
  'pending.verification@test.com',
  'delivery',
  '{"address": "Test Address 9", "fullName": "Verification Pending Customer", "phoneNumber": "+60123000009"}',
  'credit_card',
  'SUBMITTED',
  160.00, 9.60, 0.00, 15.00, 184.60,
  'PENDING_VERIFICATION',
  'Test order with PENDING_VERIFICATION status',
  NOW() - INTERVAL '9 hours',
  NOW() - INTERVAL '9 hours'
),
(
  'STATUS-TEST-010',
  'Verified Customer',
  '+60123000010',
  'verified.order@test.com',
  'delivery',
  '{"address": "Test Address 10", "fullName": "Verified Customer", "phoneNumber": "+60123000010"}',
  'bank_transfer',
  'APPROVED',
  280.00, 16.80, 20.00, 15.00, 291.80,
  'VERIFIED',
  'Test order with VERIFIED status',
  NOW() - INTERVAL '10 hours',
  NOW() - INTERVAL '10 hours'
),

-- Additional statuses
(
  'STATUS-TEST-011',
  'Cancelled Customer',
  '+60123000011',
  'cancelled@test.com',
  'delivery',
  '{"address": "Test Address 11", "fullName": "Cancelled Customer", "phoneNumber": "+60123000011"}',
  'credit_card',
  'REJECTED',
  190.00, 11.40, 0.00, 15.00, 216.40,
  'CANCELLED',
  'Test order with CANCELLED status',
  NOW() - INTERVAL '11 hours',
  NOW() - INTERVAL '11 hours'
),
(
  'STATUS-TEST-012',
  'Rejected Customer',
  '+60123000012',
  'rejected.order@test.com',
  'delivery',
  '{"address": "Test Address 12", "fullName": "Rejected Customer", "phoneNumber": "+60123000012"}',
  'bank_transfer',
  'REJECTED',
  240.00, 14.40, 0.00, 15.00, 269.40,
  'REJECTED',
  'Test order with REJECTED status',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '12 hours'
);

-- Add some order items for the test orders
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
  'TEST-SKU-' || SUBSTRING(o.order_no FROM 13),
  'Test Component for ' || o.status,
  'Test Vehicle Build',
  1,
  o.subtotal,
  o.subtotal
FROM orders o
WHERE o.order_no LIKE 'STATUS-TEST-%'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  );

-- Show summary of created test orders
SELECT 'Test orders created for status filtering:' as info;
SELECT
  status,
  COUNT(*) as count,
  STRING_AGG(order_no, ', ' ORDER BY order_no) as order_numbers
FROM orders
WHERE order_no LIKE 'STATUS-TEST-%'
GROUP BY status
ORDER BY status;

-- Show all test orders with details
SELECT 'All test orders with different statuses:' as details;
SELECT
  order_no,
  customer_name,
  status,
  payment_state,
  total,
  created_at
FROM orders
WHERE order_no LIKE 'STATUS-TEST-%'
ORDER BY order_no;

SELECT 'Status filter testing ready!' as result;
SELECT 'You can now test the status filter dropdown in the Orders page with all these different statuses.' as instructions;