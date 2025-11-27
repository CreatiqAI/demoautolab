-- =====================================================
-- VOUCHER SYSTEM - Update Only (Skip if already exists)
-- =====================================================
-- This version only adds the new customer filtering function
-- and updates existing functions without recreating tables

-- 1. Update validate_voucher function with enhanced validation
CREATE OR REPLACE FUNCTION validate_voucher(
  p_voucher_code TEXT,
  p_customer_id UUID,
  p_order_amount NUMERIC
)
RETURNS TABLE(
  valid BOOLEAN,
  voucher_id UUID,
  discount_amount NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_voucher RECORD;
  v_customer_type TEXT;
  v_usage_count INTEGER;
  v_calculated_discount NUMERIC;
BEGIN
  -- Get voucher details - MUST be active
  SELECT * INTO v_voucher
  FROM vouchers
  WHERE UPPER(code) = UPPER(p_voucher_code)
  AND is_active = true;  -- Only get active vouchers

  -- Check if voucher exists and is active
  IF v_voucher IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher code not found or inactive';
    RETURN;
  END IF;

  -- Check validity period - must be currently valid
  IF v_voucher.valid_from > NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher is not yet valid';
    RETURN;
  END IF;

  -- Check expiration - must not be expired
  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher has expired';
    RETURN;
  END IF;

  -- Check minimum purchase amount
  IF p_order_amount < v_voucher.min_purchase_amount THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0::NUMERIC,
      'Minimum purchase amount of RM ' || v_voucher.min_purchase_amount || ' required';
    RETURN;
  END IF;

  -- Check total usage limit
  IF v_voucher.max_usage_total IS NOT NULL AND v_voucher.current_usage_count >= v_voucher.max_usage_total THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher usage limit reached';
    RETURN;
  END IF;

  -- Check customer type restriction
  SELECT customer_type INTO v_customer_type
  FROM customer_profiles
  WHERE id = p_customer_id;

  IF v_voucher.customer_type_restriction != 'ALL' THEN
    IF v_voucher.customer_type_restriction = 'NORMAL' AND v_customer_type != 'normal' THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is only for normal customers';
      RETURN;
    END IF;

    IF v_voucher.customer_type_restriction = 'MERCHANT' AND v_customer_type != 'merchant' THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is only for merchant customers';
      RETURN;
    END IF;
  END IF;

  -- Check specific customer restriction
  IF v_voucher.specific_customer_ids IS NOT NULL AND array_length(v_voucher.specific_customer_ids, 1) > 0 THEN
    IF NOT (p_customer_id = ANY(v_voucher.specific_customer_ids)) THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is not available for your account';
      RETURN;
    END IF;
  END IF;

  -- Check per-user usage limit
  SELECT COUNT(*) INTO v_usage_count
  FROM voucher_usage
  WHERE voucher_id = v_voucher.id
  AND customer_id = p_customer_id;

  IF v_usage_count >= v_voucher.max_usage_per_user THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'You have already used this voucher the maximum number of times';
    RETURN;
  END IF;

  -- Calculate discount
  IF v_voucher.discount_type = 'PERCENTAGE' THEN
    v_calculated_discount := (p_order_amount * v_voucher.discount_value / 100);

    -- Apply max discount cap if set
    IF v_voucher.max_discount_amount IS NOT NULL AND v_calculated_discount > v_voucher.max_discount_amount THEN
      v_calculated_discount := v_voucher.max_discount_amount;
    END IF;
  ELSE
    v_calculated_discount := v_voucher.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order amount
  IF v_calculated_discount > p_order_amount THEN
    v_calculated_discount := p_order_amount;
  END IF;

  -- Return success with discount amount
  RETURN QUERY SELECT
    true,
    v_voucher.id,
    v_calculated_discount,
    'Voucher applied successfully';
END;
$$ LANGUAGE plpgsql;

-- 2. Create/Update function to get available vouchers for a customer
CREATE OR REPLACE FUNCTION get_available_vouchers_for_customer(
  p_customer_id UUID
)
RETURNS TABLE(
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  max_discount_amount NUMERIC,
  min_purchase_amount NUMERIC,
  max_usage_per_user INTEGER,
  valid_until TIMESTAMP WITH TIME ZONE,
  times_used INTEGER,
  can_still_use BOOLEAN
) AS $$
DECLARE
  v_customer_type TEXT;
BEGIN
  -- Get customer type
  SELECT customer_type INTO v_customer_type
  FROM customer_profiles
  WHERE id = p_customer_id;

  -- Return available vouchers based on customer type and restrictions
  RETURN QUERY
  SELECT
    v.id::UUID,
    v.code::TEXT,
    v.name::TEXT,
    v.description::TEXT,
    v.discount_type::TEXT,
    v.discount_value::NUMERIC,
    v.max_discount_amount::NUMERIC,
    v.min_purchase_amount::NUMERIC,
    v.max_usage_per_user::INTEGER,
    v.valid_until::TIMESTAMP WITH TIME ZONE,
    COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM voucher_usage vu
       WHERE vu.voucher_id = v.id
       AND vu.customer_id = p_customer_id),
      0
    )::INTEGER as times_used,
    (COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM voucher_usage vu
       WHERE vu.voucher_id = v.id
       AND vu.customer_id = p_customer_id),
      0
    ) < v.max_usage_per_user)::BOOLEAN as can_still_use
  FROM vouchers v
  WHERE v.is_active = true
    AND v.valid_from <= NOW()
    AND (v.valid_until IS NULL OR v.valid_until >= NOW())
    AND (
      v.customer_type_restriction = 'ALL'
      OR (v.customer_type_restriction = 'NORMAL' AND v_customer_type = 'normal')
      OR (v.customer_type_restriction = 'MERCHANT' AND v_customer_type = 'merchant')
    )
    AND (
      v.specific_customer_ids IS NULL
      OR p_customer_id = ANY(v.specific_customer_ids)
    )
    AND (
      v.max_usage_total IS NULL
      OR v.current_usage_count < v.max_usage_total
    )
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Verify tables exist and show status
DO $$
BEGIN
  -- Check if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vouchers') THEN
    RAISE NOTICE '✅ vouchers table exists';
  ELSE
    RAISE NOTICE '❌ vouchers table does NOT exist - run full voucher-system.sql first';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voucher_usage') THEN
    RAISE NOTICE '✅ voucher_usage table exists';
  ELSE
    RAISE NOTICE '❌ voucher_usage table does NOT exist - run full voucher-system.sql first';
  END IF;

  -- Count existing vouchers
  DECLARE
    v_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM vouchers;
    RAISE NOTICE '📊 Total vouchers in database: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not count vouchers';
  END;

  RAISE NOTICE '✅ Functions updated successfully!';
  RAISE NOTICE '📝 Available functions:';
  RAISE NOTICE '  - validate_voucher(code, customer_id, order_amount)';
  RAISE NOTICE '  - apply_voucher_to_order(order_id, code, customer_id, order_amount, discount)';
  RAISE NOTICE '  - get_available_vouchers_for_customer(customer_id)';
END $$;
