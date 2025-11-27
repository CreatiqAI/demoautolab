-- =====================================================
-- FIX: Apply Voucher to Order Function
-- =====================================================

DROP FUNCTION IF EXISTS apply_voucher_to_order(UUID, TEXT, UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION apply_voucher_to_order(
  p_order_id UUID,
  p_voucher_code TEXT,
  p_customer_id UUID,
  p_order_amount NUMERIC,
  p_discount_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_voucher_id UUID;
BEGIN
  -- Get voucher ID
  SELECT id INTO v_voucher_id
  FROM vouchers
  WHERE UPPER(code) = UPPER(p_voucher_code)
  AND is_active = true;

  IF v_voucher_id IS NULL THEN
    RAISE NOTICE 'Voucher not found: %', p_voucher_code;
    RETURN false;
  END IF;

  -- Update order with voucher details
  UPDATE orders
  SET
    voucher_id = v_voucher_id,
    voucher_code = p_voucher_code,
    voucher_discount = p_discount_amount
  WHERE id = p_order_id;

  -- Record voucher usage
  INSERT INTO voucher_usage (
    voucher_id,
    customer_id,
    order_id,
    discount_applied,
    order_amount
  ) VALUES (
    v_voucher_id,
    p_customer_id,
    p_order_id,
    p_discount_amount,
    p_order_amount
  )
  ON CONFLICT (voucher_id, order_id) DO NOTHING;

  -- Increment voucher usage count
  UPDATE vouchers
  SET current_usage_count = current_usage_count + 1
  WHERE id = v_voucher_id;

  RAISE NOTICE 'Voucher applied successfully: % (RM %)', p_voucher_code, p_discount_amount;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Verify columns exist in orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_id'
  ) THEN
    RAISE NOTICE '⚠️ Adding voucher_id column to orders table';
    ALTER TABLE orders ADD COLUMN voucher_id UUID REFERENCES vouchers(id);
  ELSE
    RAISE NOTICE '✅ voucher_id column exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_code'
  ) THEN
    RAISE NOTICE '⚠️ Adding voucher_code column to orders table';
    ALTER TABLE orders ADD COLUMN voucher_code TEXT;
  ELSE
    RAISE NOTICE '✅ voucher_code column exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_discount'
  ) THEN
    RAISE NOTICE '⚠️ Adding voucher_discount column to orders table';
    ALTER TABLE orders ADD COLUMN voucher_discount NUMERIC(10,2) DEFAULT 0;
  ELSE
    RAISE NOTICE '✅ voucher_discount column exists';
  END IF;

  RAISE NOTICE '✅ apply_voucher_to_order function fixed!';
END $$;
