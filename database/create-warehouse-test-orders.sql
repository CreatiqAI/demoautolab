-- Create test orders with warehouse statuses for testing Warehouse Operations page

-- First check if we have any orders with warehouse statuses
SELECT 'Current warehouse orders by status:' as info;
SELECT
  status,
  COUNT(*) as count
FROM orders
WHERE status IN ('PROCESSING', 'WAREHOUSE_ASSIGNED', 'PICKING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED')
GROUP BY status
ORDER BY
  CASE status
    WHEN 'PROCESSING' THEN 1
    WHEN 'WAREHOUSE_ASSIGNED' THEN 2
    WHEN 'PICKING' THEN 3
    WHEN 'PACKING' THEN 4
    WHEN 'READY_FOR_DELIVERY' THEN 5
    WHEN 'OUT_FOR_DELIVERY' THEN 6
    WHEN 'DELIVERED' THEN 7
  END;

-- Create test orders with warehouse statuses
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
-- Order 1: PROCESSING status
(
  'WH-TEST-001',
  'Processing Customer',
  '+60123456789',
  'processing@example.com',
  'delivery',
  '{"address": "123 Processing Street\nKuala Lumpur 50000\nMalaysia", "fullName": "Processing Customer", "phoneNumber": "+60123456789"}',
  'credit_card',
  'APPROVED',
  150.00,
  9.00,
  0.00,
  15.00,
  174.00,
  'PROCESSING',
  'Order ready for warehouse assignment',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),
-- Order 2: WAREHOUSE_ASSIGNED status
(
  'WH-TEST-002',
  'Assigned Customer',
  '+60198765432',
  'assigned@example.com',
  'delivery',
  '{"address": "456 Assigned Avenue\nPetaling Jaya 47300\nMalaysia", "fullName": "Assigned Customer", "phoneNumber": "+60198765432"}',
  'bank_transfer',
  'APPROVED',
  200.00,
  12.00,
  10.00,
  15.00,
  217.00,
  'WAREHOUSE_ASSIGNED',
  'Assigned to warehouse team',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),
-- Order 3: PICKING status
(
  'WH-TEST-003',
  'Picking Customer',
  '+60187654321',
  'picking@example.com',
  'delivery',
  '{"address": "789 Picking Place\nSubang Jaya 47500\nMalaysia", "fullName": "Picking Customer", "phoneNumber": "+60187654321"}',
  'cash_on_delivery',
  'SUBMITTED',
  180.00,
  10.80,
  0.00,
  15.00,
  205.80,
  'PICKING',
  'Items being picked from inventory',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
),
-- Order 4: PACKING status
(
  'WH-TEST-004',
  'Packing Customer',
  '+60176543210',
  'packing@example.com',
  'self-pickup',
  '{}',
  'credit_card',
  'APPROVED',
  320.00,
  19.20,
  20.00,
  0.00,
  319.20,
  'PACKING',
  'Items being packed for delivery',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes'
),
-- Order 5: READY_FOR_DELIVERY status
(
  'WH-TEST-005',
  'Ready Customer',
  '+60165432109',
  'ready@example.com',
  'delivery',
  '{"address": "321 Ready Road\nShah Alam 40000\nMalaysia", "fullName": "Ready Customer", "phoneNumber": "+60165432109"}',
  'bank_transfer',
  'APPROVED',
  250.00,
  15.00,
  5.00,
  15.00,
  275.00,
  'READY_FOR_DELIVERY',
  'Ready for pickup/delivery',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
),
-- Order 6: OUT_FOR_DELIVERY status
(
  'WH-TEST-006',
  'Dispatched Customer',
  '+60154321098',
  'dispatched@example.com',
  'delivery',
  '{"address": "654 Dispatch Drive\nKlang 41000\nMalaysia", "fullName": "Dispatched Customer", "phoneNumber": "+60154321098"}',
  'credit_card',
  'APPROVED',
  400.00,
  24.00,
  0.00,
  15.00,
  439.00,
  'OUT_FOR_DELIVERY',
  'Out for delivery',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '5 minutes'
)
ON CONFLICT (order_no) DO UPDATE SET
  updated_at = NOW(),
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

-- Create test order items for warehouse orders
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
  'WH-SKU-' || SUBSTRING(o.order_no FROM 9),  -- Extract test number from order_no
  'Warehouse Test Component ' || SUBSTRING(o.order_no FROM 9),
  'Test Vehicle Build',
  (RANDOM() * 3 + 1)::integer,  -- 1-4 quantity
  ROUND((RANDOM() * 100 + 50)::numeric, 2),  -- 50-150 price
  ROUND(((RANDOM() * 3 + 1) * (RANDOM() * 100 + 50))::numeric, 2)
FROM orders o
WHERE o.order_no LIKE 'WH-TEST-%'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  );

-- Add a second item to some orders for variety
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
  'WH-SKU-' || SUBSTRING(o.order_no FROM 9) || 'B',
  'Secondary Component ' || SUBSTRING(o.order_no FROM 9),
  'Additional Part',
  (RANDOM() * 2 + 1)::integer,  -- 1-3 quantity
  ROUND((RANDOM() * 80 + 20)::numeric, 2),   -- 20-100 price
  ROUND(((RANDOM() * 2 + 1) * (RANDOM() * 80 + 20))::numeric, 2)
FROM orders o
WHERE o.order_no IN ('WH-TEST-002', 'WH-TEST-004', 'WH-TEST-006')  -- Add to some orders
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = o.id
    AND oi.component_sku LIKE 'WH-SKU-%B'
  );

-- Verify the warehouse test orders were created
SELECT 'Warehouse test orders created successfully!' as result;

-- Show final count by warehouse status
SELECT 'Final warehouse orders by status:' as info;
SELECT
  status,
  COUNT(*) as count
FROM orders
WHERE status IN ('PROCESSING', 'WAREHOUSE_ASSIGNED', 'PICKING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED')
GROUP BY status
ORDER BY
  CASE status
    WHEN 'PROCESSING' THEN 1
    WHEN 'WAREHOUSE_ASSIGNED' THEN 2
    WHEN 'PICKING' THEN 3
    WHEN 'PACKING' THEN 4
    WHEN 'READY_FOR_DELIVERY' THEN 5
    WHEN 'OUT_FOR_DELIVERY' THEN 6
    WHEN 'DELIVERED' THEN 7
  END;

-- Show the created test orders
SELECT 'Warehouse test orders:' as info;
SELECT
  order_no,
  customer_name,
  status,
  total,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = orders.id) as item_count,
  created_at
FROM orders
WHERE order_no LIKE 'WH-TEST-%'
ORDER BY order_no;