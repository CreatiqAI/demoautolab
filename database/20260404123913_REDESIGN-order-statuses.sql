-- ============================================================================
-- ORDER STATUS REDESIGN + RETURNS ENHANCEMENT
-- ============================================================================
-- Simplifies order statuses to a clear 4-step fulfillment flow:
-- PROCESSING → PACKING → OUT_FOR_DELIVERY → COMPLETED
-- Plus terminal statuses: PAYMENT_FAILED, CANCELLED
--
-- Also enhances the returns table with admin-initiated returns,
-- refund tracking, and inventory restocking support.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART A: ORDER STATUS MIGRATION
-- ============================================================================

-- Step 1: Show current state before migration
SELECT 'BEFORE MIGRATION - Current status distribution:' as info;
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Step 2: Migrate old statuses to new values
UPDATE orders SET status = 'PROCESSING' WHERE status IN ('PLACED', 'PENDING_VERIFICATION', 'VERIFIED', 'PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION', 'PAYMENT_VERIFIED');
UPDATE orders SET status = 'PACKING' WHERE status IN ('PICKING', 'READY_FOR_DELIVERY', 'READY');
UPDATE orders SET status = 'OUT_FOR_DELIVERY' WHERE status IN ('DISPATCHED');
UPDATE orders SET status = 'COMPLETED' WHERE status IN ('DELIVERED');
UPDATE orders SET status = 'PAYMENT_FAILED' WHERE status IN ('REJECTED', 'PAYMENT_REJECTED');

-- Keep these as-is: PROCESSING, PACKING, OUT_FOR_DELIVERY, COMPLETED, CANCELLED, PAYMENT_FAILED

-- Step 3: Verify migration
SELECT 'AFTER MIGRATION - New status distribution:' as info;
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Step 4: Add CHECK constraint to enforce valid statuses
-- Drop existing constraint if any
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE orders ADD CONSTRAINT chk_order_status
  CHECK (status IN ('PROCESSING', 'PACKING', 'OUT_FOR_DELIVERY', 'READY_FOR_COLLECTION', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED'));

-- Step 5: Add new tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_printed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_created_at TIMESTAMPTZ;

SELECT '✓ Order status migration complete' as status;

-- ============================================================================
-- PART B: RETURNS TABLE ENHANCEMENT
-- ============================================================================

-- Add admin-initiated return support
ALTER TABLE returns ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT false;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS return_instructions TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS return_address TEXT;

-- Add refund tracking
ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'PENDING';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_reference TEXT;

-- Add inventory restocking tracking
ALTER TABLE returns ADD COLUMN IF NOT EXISTS restocked BOOLEAN DEFAULT false;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS restocked_by UUID;

-- Add CHECK constraint for refund_status
ALTER TABLE returns DROP CONSTRAINT IF EXISTS chk_refund_status;
ALTER TABLE returns ADD CONSTRAINT chk_refund_status
  CHECK (refund_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));

SELECT '✓ Returns table enhanced' as status;

-- ============================================================================
-- PART C: RESTOCK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION restock_return_items(p_return_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
BEGIN
  -- Check if already restocked
  IF EXISTS (SELECT 1 FROM returns WHERE id = p_return_id AND restocked = true) THEN
    RAISE EXCEPTION 'Return items have already been restocked';
  END IF;

  -- Iterate return items and restore inventory
  FOR item IN
    SELECT ri.component_sku, ri.quantity
    FROM return_items ri
    WHERE ri.return_id = p_return_id
  LOOP
    UPDATE component_library
    SET stock_level = stock_level + item.quantity
    WHERE sku = item.component_sku;
  END LOOP;

  -- Mark return as restocked
  UPDATE returns
  SET restocked = true,
      restocked_at = NOW(),
      updated_at = NOW()
  WHERE id = p_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✓ Restock function created' as status;

-- ============================================================================
-- PART D: UPDATE WEBHOOK TRIGGER
-- ============================================================================
-- The existing log_order_status_webhook() trigger function handles all statuses
-- dynamically (reads NEW.status directly), so it works with the new statuses
-- without modification. No changes needed to the trigger.

SELECT '✓ All migrations complete!' as final_status;

COMMIT;
