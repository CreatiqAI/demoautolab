-- ============================================
-- AUTOLAB: MIGRATE TO AUTOMATED ORDER FLOW
-- Version: 1.0
-- Description: Remove manual approval, implement auto-approval
-- ============================================
--
-- This migration converts the order system from manual admin approval
-- to fully automated payment gateway approval (like Shopee).
--
-- Changes:
-- - Removes PLACED status (orders go straight to PROCESSING)
-- - Removes manual approval columns
-- - Adds PAYMENT_FAILED status
-- - Creates auto-approval trigger
-- - Updates all existing orders to new status values
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- =============================================
-- STEP 1: BACKUP - Show current state
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 1: CURRENT STATE BEFORE MIGRATION' as info;
SELECT '========================================' as info;

SELECT 'Current Status Distribution:' as section;
SELECT status, payment_state, COUNT(*) as count
FROM orders
GROUP BY status, payment_state
ORDER BY count DESC;

SELECT 'Current Column Structure:' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('status', 'payment_state', 'approved_at', 'verification_notes')
ORDER BY column_name;

-- =============================================
-- STEP 2: ADD NEW COLUMNS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 2: ADDING NEW COLUMNS' as info;
SELECT '========================================' as info;

-- Add timestamp columns for tracking each stage
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add courier integration columns (for Phase 3)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;

SELECT '✓ New columns added successfully' as status;

-- =============================================
-- STEP 3: REMOVE OLD COLUMNS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 3: REMOVING MANUAL APPROVAL COLUMNS' as info;
SELECT '========================================' as info;

-- Remove manual approval columns (no longer needed)
ALTER TABLE orders DROP COLUMN IF EXISTS approved_at CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS verification_notes CASCADE;

SELECT '✓ Old manual approval columns removed' as status;

-- =============================================
-- STEP 4: NORMALIZE PAYMENT_STATE VALUES
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 4: NORMALIZING PAYMENT_STATE VALUES' as info;
SELECT '========================================' as info;

-- Map old payment_state values to new standard values
UPDATE orders SET payment_state = 'SUCCESS'
WHERE payment_state IN ('APPROVED', 'PAID', 'VERIFIED');

UPDATE orders SET payment_state = 'FAILED'
WHERE payment_state IN ('REJECTED', 'DECLINED', 'UNPAID');

UPDATE orders SET payment_state = 'PROCESSING'
WHERE payment_state IN ('SUBMITTED', 'VERIFYING');

UPDATE orders SET payment_state = 'PENDING'
WHERE payment_state NOT IN ('SUCCESS', 'FAILED', 'PROCESSING');

-- Remove ON_CREDIT (no longer supported)
UPDATE orders SET payment_state = 'SUCCESS'
WHERE payment_state = 'ON_CREDIT';

SELECT '✓ Payment states normalized' as status;

-- =============================================
-- STEP 5: DROP DEPENDENT VIEWS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 5: DROPPING DEPENDENT VIEWS' as info;
SELECT '========================================' as info;

-- Drop all views that depend on the status column
DROP VIEW IF EXISTS admin_orders_enhanced CASCADE;
DROP VIEW IF EXISTS admin_orders CASCADE;
DROP VIEW IF EXISTS order_status_summary CASCADE;

SELECT '✓ Dependent views dropped' as status;

-- =============================================
-- STEP 6: REMOVE OLD CONSTRAINTS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 6: REMOVING OLD CONSTRAINTS' as info;
SELECT '========================================' as info;

-- Remove old status constraint (must do this BEFORE updating values)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Remove old payment_state constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_state_check;

-- Convert status column to TEXT if it's an enum
DO $$
BEGIN
  -- Check if status column is an enum type and convert to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'status'
    AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE orders ALTER COLUMN status TYPE TEXT;
  END IF;
END $$;

SELECT '✓ Old constraints removed' as status;

-- =============================================
-- STEP 7: NORMALIZE STATUS VALUES
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 7: NORMALIZING STATUS VALUES' as info;
SELECT '========================================' as info;

-- Auto-approve orders with successful payment
UPDATE orders
SET status = 'PROCESSING',
    processing_started_at = created_at
WHERE status IN ('PLACED', 'PENDING', 'PAYMENT_VERIFIED', 'VERIFIED', 'WAREHOUSE_ASSIGNED', 'PENDING_VERIFICATION')
AND payment_state = 'SUCCESS'
AND status NOT IN ('COMPLETED', 'CANCELLED');

-- Failed payments get special status
UPDATE orders
SET status = 'PAYMENT_FAILED'
WHERE payment_state = 'FAILED'
AND status NOT IN ('COMPLETED', 'CANCELLED', 'PAYMENT_FAILED');

-- Map old delivery statuses
UPDATE orders
SET status = 'OUT_FOR_DELIVERY',
    dispatched_at = COALESCE(updated_at, created_at)
WHERE status IN ('DISPATCHED', 'SHIPPED', 'IN_TRANSIT')
AND status NOT IN ('COMPLETED', 'CANCELLED');

UPDATE orders
SET status = 'DELIVERED',
    delivered_at = COALESCE(updated_at, created_at)
WHERE status IN ('RECEIVED')
AND status NOT IN ('COMPLETED', 'CANCELLED');

SELECT '✓ Order statuses normalized' as status;

-- =============================================
-- STEP 8: APPLY NEW CONSTRAINTS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 8: APPLYING NEW DATABASE CONSTRAINTS' as info;
SELECT '========================================' as info;

-- Apply new status constraint (removed PLACED, added PAYMENT_FAILED)
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'PROCESSING',
  'PICKING',
  'PACKING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'PAYMENT_FAILED',
  'CANCELLED'
));

-- Apply new payment_state constraint
ALTER TABLE orders ADD CONSTRAINT orders_payment_state_check
CHECK (payment_state IN (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED'
));

-- Set defaults
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'PROCESSING';
ALTER TABLE orders ALTER COLUMN payment_state SET DEFAULT 'PENDING';

SELECT '✓ New constraints applied' as status;

-- =============================================
-- STEP 9: CREATE AUTO-APPROVAL TRIGGER
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 9: CREATING AUTO-APPROVAL TRIGGER' as info;
SELECT '========================================' as info;

-- Function to auto-approve orders when payment succeeds
CREATE OR REPLACE FUNCTION auto_approve_on_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment_state changes to SUCCESS, auto-set status to PROCESSING
  IF NEW.payment_state = 'SUCCESS' AND (OLD.payment_state IS NULL OR OLD.payment_state != 'SUCCESS') THEN
    NEW.status := 'PROCESSING';
    NEW.processing_started_at := NOW();
  END IF;

  -- When payment_state changes to FAILED, set status to PAYMENT_FAILED
  IF NEW.payment_state = 'FAILED' AND (OLD.payment_state IS NULL OR OLD.payment_state != 'FAILED') THEN
    NEW.status := 'PAYMENT_FAILED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_approve_on_payment_success ON orders;

-- Create trigger
CREATE TRIGGER trigger_auto_approve_on_payment_success
  BEFORE INSERT OR UPDATE OF payment_state ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_on_payment_success();

SELECT '✓ Auto-approval trigger created' as status;

-- =============================================
-- STEP 10: CREATE INDEXES FOR PERFORMANCE
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 10: CREATING PERFORMANCE INDEXES' as info;
SELECT '========================================' as info;

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for payment_state queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_state ON orders(payment_state);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON orders(status, payment_state);

-- Index for warehouse operations (most common query)
CREATE INDEX IF NOT EXISTS idx_orders_processing ON orders(status, created_at)
  WHERE status = 'PROCESSING' AND payment_state = 'SUCCESS';

-- Index for completed/archived orders
CREATE INDEX IF NOT EXISTS idx_orders_completed ON orders(completed_at DESC)
  WHERE status = 'COMPLETED';

-- Index for failed payments
CREATE INDEX IF NOT EXISTS idx_orders_failed_payments ON orders(created_at DESC)
  WHERE payment_state = 'FAILED';

SELECT '✓ Performance indexes created' as status;

-- =============================================
-- STEP 11: RECREATE ADMIN ORDERS VIEW
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 11: RECREATING ADMIN ORDERS VIEW' as info;
SELECT '========================================' as info;

-- Recreate the admin_orders_enhanced view with new status values
CREATE OR REPLACE VIEW admin_orders_enhanced AS
SELECT
  o.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', oi.id,
        'component_sku', oi.component_sku,
        'component_name', oi.component_name,
        'product_context', oi.product_context,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

SELECT '✓ Admin orders view recreated' as status;

-- =============================================
-- STEP 12: CREATE HELPER RPC FUNCTIONS
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 12: CREATING HELPER RPC FUNCTIONS' as info;
SELECT '========================================' as info;

-- Function to get orders for warehouse (auto-approved only)
CREATE OR REPLACE FUNCTION get_warehouse_orders(warehouse_status TEXT DEFAULT 'PROCESSING')
RETURNS TABLE (
  id UUID,
  order_no TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  delivery_method TEXT,
  delivery_address JSONB,
  total NUMERIC,
  status TEXT,
  payment_state TEXT,
  created_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  order_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_no,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.delivery_method,
    o.delivery_address,
    o.total,
    o.status,
    o.payment_state,
    o.created_at,
    o.processing_started_at,
    (
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'component_sku', oi.component_sku,
        'component_name', oi.component_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    )::JSONB as order_items
  FROM orders o
  WHERE o.status = warehouse_status
  AND o.payment_state = 'SUCCESS'
  ORDER BY o.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get failed payment orders (for exceptions page)
CREATE OR REPLACE FUNCTION get_failed_payment_orders()
RETURNS TABLE (
  id UUID,
  order_no TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  payment_method TEXT,
  payment_state TEXT,
  payment_gateway_response JSONB,
  total NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_no,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.payment_method,
    o.payment_state,
    o.payment_gateway_response,
    o.total,
    o.created_at
  FROM orders o
  WHERE o.payment_state = 'FAILED'
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop old manual verification function if exists
DROP FUNCTION IF EXISTS get_orders_pending_verification();

SELECT '✓ Helper RPC functions created' as status;

-- =============================================
-- STEP 13: FINAL VERIFICATION
-- =============================================
SELECT '========================================' as info;
SELECT 'STEP 13: FINAL VERIFICATION' as info;
SELECT '========================================' as info;

SELECT 'New Status Distribution:' as section;
SELECT status, payment_state, COUNT(*) as count
FROM orders
GROUP BY status, payment_state
ORDER BY status, payment_state;

SELECT 'Column Changes Verified:' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('status', 'payment_state', 'processing_started_at', 'delivery_proof_url', 'courier_status')
ORDER BY column_name;

SELECT 'Indexes Created:' as section;
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders'
AND indexname LIKE 'idx_orders_%'
ORDER BY indexname;

SELECT 'Triggers Created:' as section;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

SELECT 'RPC Functions Created:' as section;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_warehouse_orders', 'get_failed_payment_orders', 'auto_approve_on_payment_success')
ORDER BY routine_name;

COMMIT;

-- =============================================
-- MIGRATION COMPLETED
-- =============================================
SELECT '========================================' as info;
SELECT '✅ MIGRATION COMPLETED SUCCESSFULLY!' as info;
SELECT '========================================' as info;
SELECT '' as info;
SELECT 'Summary of Changes:' as info;
SELECT '- Removed PLACED status (orders go straight to PROCESSING)' as change;
SELECT '- Removed manual approval columns (approved_at, verification_notes)' as change;
SELECT '- Added PAYMENT_FAILED status for clarity' as change;
SELECT '- Created auto-approval trigger for payment_state=SUCCESS' as change;
SELECT '- Added timestamp columns for all order stages' as change;
SELECT '- Added courier integration columns (Phase 3 ready)' as change;
SELECT '- Created performance indexes' as change;
SELECT '- Created helper RPC functions' as change;
SELECT '' as info;
SELECT '🎉 Order system is now fully automated!' as info;
SELECT '📦 Orders will auto-approve when payment succeeds' as info;
SELECT '🚀 24/7 operation - no manual approval needed' as info;
