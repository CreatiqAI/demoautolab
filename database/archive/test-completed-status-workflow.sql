-- Test script for the new COMPLETED status workflow
-- This demonstrates how orders flow from DELIVERED to COMPLETED status

-- First, make sure COMPLETED status exists (run add-completed-status.sql first)
SELECT 'Testing COMPLETED status workflow...' as info;

-- Create test orders at different stages
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
-- Test order 1: DELIVERED status (ready to be completed)
(
  'WORKFLOW-TEST-001',
  'Delivered Customer',
  '+60123456789',
  'delivered@example.com',
  'delivery',
  '{"address": "123 Delivered Street\nKuala Lumpur 50000\nMalaysia", "fullName": "Delivered Customer", "phoneNumber": "+60123456789"}',
  'credit_card',
  'APPROVED',
  200.00,
  12.00,
  0.00,
  15.00,
  227.00,
  'DELIVERED',
  'Order delivered, ready to be marked as completed',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 hours'
),
-- Test order 2: Already COMPLETED (should appear in archive)
(
  'WORKFLOW-TEST-002',
  'Completed Customer',
  '+60198765432',
  'completed@example.com',
  'delivery',
  '{"address": "456 Completed Avenue\nPetaling Jaya 47300\nMalaysia", "fullName": "Completed Customer", "phoneNumber": "+60198765432"}',
  'bank_transfer',
  'APPROVED',
  150.00,
  9.00,
  5.00,
  15.00,
  169.00,
  'COMPLETED',
  'Order completed and archived',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
),
-- Test order 3: Active order (should appear in main orders page)
(
  'WORKFLOW-TEST-003',
  'Active Customer',
  '+60187654321',
  'active@example.com',
  'delivery',
  '{"address": "789 Active Street\nSubang Jaya 47500\nMalaysia", "fullName": "Active Customer", "phoneNumber": "+60187654321"}',
  'credit_card',
  'APPROVED',
  300.00,
  18.00,
  10.00,
  15.00,
  323.00,
  'VERIFIED',
  'Active order in main orders page',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
)
ON CONFLICT (order_no) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at,
  notes = EXCLUDED.notes;

-- Add test order items
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
  'WF-SKU-' || SUBSTRING(o.order_no FROM 15), -- Extract test number
  'Workflow Test Component ' || SUBSTRING(o.order_no FROM 15),
  'Test Vehicle Build',
  2,
  ROUND((o.total / 2)::numeric, 2),
  o.total
FROM orders o
WHERE o.order_no LIKE 'WORKFLOW-TEST-%'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
  );

-- Show the test data created
SELECT 'Test orders created for COMPLETED status workflow:' as info;
SELECT
  order_no,
  customer_name,
  status,
  total,
  notes,
  created_at,
  updated_at
FROM orders
WHERE order_no LIKE 'WORKFLOW-TEST-%'
ORDER BY order_no;

-- Show order distribution by status
SELECT 'Order status distribution after test creation:' as info;
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Demonstrate the workflow:
SELECT 'COMPLETED Status Workflow Demonstration:' as workflow;
SELECT
  '1. Orders with DELIVERED status appear in Warehouse Operations' as step_1,
  '2. From Warehouse Operations, DELIVERED orders can be marked as COMPLETED' as step_2,
  '3. From main Orders page, any order can be marked as COMPLETED directly' as step_3,
  '4. COMPLETED orders appear ONLY in Archived Orders page' as step_4,
  '5. COMPLETED orders do NOT appear in main Orders page or Warehouse Operations' as step_5;

-- Test the workflow by simulating status changes
BEGIN;

-- Simulate marking DELIVERED order as COMPLETED (from Warehouse Operations)
UPDATE orders
SET status = 'COMPLETED', updated_at = NOW()
WHERE order_no = 'WORKFLOW-TEST-001';

SELECT 'Simulated: WORKFLOW-TEST-001 marked as COMPLETED' as simulation;

-- Show final status after simulation
SELECT
  order_no,
  status,
  'Should appear in Archived Orders page only' as location
FROM orders
WHERE order_no = 'WORKFLOW-TEST-001';

-- Rollback the simulation
ROLLBACK;

SELECT 'COMPLETED status workflow test completed successfully!' as result;
SELECT 'Ready to test in the web interface:' as next_steps;
SELECT
  '• Check main Orders page - should show VERIFIED order only' as step1,
  '• Check Warehouse Operations - should show DELIVERED order' as step2,
  '• Check Archived Orders - should show COMPLETED order' as step3,
  '• Test Mark Complete buttons in both pages' as step4;