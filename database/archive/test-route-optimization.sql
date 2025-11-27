-- Test script to create orders for route optimization testing
-- These orders will have READY_FOR_DELIVERY status and local-driver/overstate-driver delivery methods

-- Clean up any existing route test orders first (optional)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE order_no LIKE 'ROUTE-TEST-%'
);
DELETE FROM orders WHERE order_no LIKE 'ROUTE-TEST-%';

-- Create test orders with READY_FOR_DELIVERY status for route optimization testing
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
-- Local driver deliveries in different areas of Kuala Lumpur for testing
(
  'ROUTE-TEST-001',
  'Ahmad Abdullah',
  '+60123456001',
  'ahmad@test.com',
  'local-driver',
  '{"address": "123 Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur, Malaysia", "fullName": "Ahmad Abdullah", "phoneNumber": "+60123456001"}',
  'credit_card',
  'APPROVED',
  150.00, 9.00, 0.00, 0.00, 159.00,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - Bukit Bintang area',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'ROUTE-TEST-002',
  'Siti Nurhaliza',
  '+60123456002',
  'siti@test.com',
  'local-driver',
  '{"address": "456 Jalan Ampang, KLCC, 50450 Kuala Lumpur, Malaysia", "fullName": "Siti Nurhaliza", "phoneNumber": "+60123456002"}',
  'bank_transfer',
  'APPROVED',
  220.00, 13.20, 10.00, 0.00, 223.20,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - KLCC area',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'ROUTE-TEST-003',
  'Raj Kumar',
  '+60123456003',
  'raj@test.com',
  'local-driver',
  '{"address": "789 Jalan Sultan Ismail, Chow Kit, 50250 Kuala Lumpur, Malaysia", "fullName": "Raj Kumar", "phoneNumber": "+60123456003"}',
  'credit_card',
  'APPROVED',
  180.00, 10.80, 0.00, 0.00, 190.80,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - Chow Kit area',
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'ROUTE-TEST-004',
  'Lim Wei Ming',
  '+60123456004',
  'lim@test.com',
  'local-driver',
  '{"address": "101 Jalan Tun Razak, Wangsa Maju, 53200 Kuala Lumpur, Malaysia", "fullName": "Lim Wei Ming", "phoneNumber": "+60123456004"}',
  'bank_transfer',
  'APPROVED',
  300.00, 18.00, 20.00, 0.00, 298.00,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - Wangsa Maju area',
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'ROUTE-TEST-005',
  'Fatimah Zahra',
  '+60123456005',
  'fatimah@test.com',
  'overstate-driver',
  '{"address": "202 Jalan Semantan, Damansara Heights, 50490 Kuala Lumpur, Malaysia", "fullName": "Fatimah Zahra", "phoneNumber": "+60123456005"}',
  'credit_card',
  'APPROVED',
  250.00, 15.00, 0.00, 0.00, 265.00,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - Damansara Heights area',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '1 hour'
),
(
  'ROUTE-TEST-006',
  'Chen Wei Li',
  '+60123456006',
  'chen@test.com',
  'local-driver',
  '{"address": "303 Jalan Bangsar, Bangsar, 59000 Kuala Lumpur, Malaysia", "fullName": "Chen Wei Li", "phoneNumber": "+60123456006"}',
  'bank_transfer',
  'APPROVED',
  170.00, 10.20, 5.00, 0.00, 175.20,
  'READY_FOR_DELIVERY',
  'Test order for route optimization - Bangsar area',
  NOW() - INTERVAL '7 hours',
  NOW() - INTERVAL '1 hour'
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
  'AUTO-' || SUBSTRING(o.order_no FROM 12) || '-01',
  CASE
    WHEN o.order_no = 'ROUTE-TEST-001' THEN 'Engine Oil Filter'
    WHEN o.order_no = 'ROUTE-TEST-002' THEN 'Brake Pads Set'
    WHEN o.order_no = 'ROUTE-TEST-003' THEN 'Air Filter'
    WHEN o.order_no = 'ROUTE-TEST-004' THEN 'Spark Plugs Set'
    WHEN o.order_no = 'ROUTE-TEST-005' THEN 'Timing Belt'
    WHEN o.order_no = 'ROUTE-TEST-006' THEN 'Water Pump'
    ELSE 'Test Component'
  END,
  CASE
    WHEN o.order_no = 'ROUTE-TEST-001' THEN 'Honda Civic 2020'
    WHEN o.order_no = 'ROUTE-TEST-002' THEN 'Toyota Camry 2019'
    WHEN o.order_no = 'ROUTE-TEST-003' THEN 'Nissan Sentra 2021'
    WHEN o.order_no = 'ROUTE-TEST-004' THEN 'Mazda 3 2018'
    WHEN o.order_no = 'ROUTE-TEST-005' THEN 'BMW 320i 2020'
    WHEN o.order_no = 'ROUTE-TEST-006' THEN 'Mercedes C200 2019'
    ELSE 'Test Vehicle'
  END,
  1,
  o.subtotal,
  o.subtotal
FROM orders o
WHERE o.order_no LIKE 'ROUTE-TEST-%'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  );

-- Show summary of created route test orders
SELECT 'Route optimization test orders created:' as info;
SELECT
  order_no,
  customer_name,
  delivery_method,
  status,
  JSON_EXTRACT(delivery_address, '$.address') as delivery_address,
  total
FROM orders
WHERE order_no LIKE 'ROUTE-TEST-%'
ORDER BY order_no;

SELECT 'Route optimization testing ready!' as result;
SELECT 'You can now test the route optimization feature with these orders in different KL areas.' as instructions;