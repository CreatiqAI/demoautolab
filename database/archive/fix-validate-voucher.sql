-- =====================================================
-- FIX: Validate Voucher Function - Remove Ambiguous References
-- =====================================================

DROP FUNCTION IF EXISTS validate_voucher(TEXT, UUID, NUMERIC);

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
  FROM vouchers v
  WHERE UPPER(v.code) = UPPER(p_voucher_code)
  AND v.is_active = true;

  -- Check if voucher exists and is active
  IF v_voucher IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher code not found or inactive'::TEXT;
    RETURN;
  END IF;

  -- Check validity period - must be currently valid
  IF v_voucher.valid_from > NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher is not yet valid'::TEXT;
    RETURN;
  END IF;

  -- Check expiration - must not be expired
  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher has expired'::TEXT;
    RETURN;
  END IF;

  -- Check minimum purchase amount
  IF p_order_amount < v_voucher.min_purchase_amount THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0::NUMERIC,
      ('Minimum purchase amount of RM ' || v_voucher.min_purchase_amount || ' required')::TEXT;
    RETURN;
  END IF;

  -- Check total usage limit
  IF v_voucher.max_usage_total IS NOT NULL AND v_voucher.current_usage_count >= v_voucher.max_usage_total THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Voucher usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Check customer type restriction
  SELECT cp.customer_type INTO v_customer_type
  FROM customer_profiles cp
  WHERE cp.id = p_customer_id;

  IF v_voucher.customer_type_restriction != 'ALL' THEN
    IF v_voucher.customer_type_restriction = 'NORMAL' AND v_customer_type != 'normal' THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is only for normal customers'::TEXT;
      RETURN;
    END IF;

    IF v_voucher.customer_type_restriction = 'MERCHANT' AND v_customer_type != 'merchant' THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is only for merchant customers'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check specific customer restriction
  IF v_voucher.specific_customer_ids IS NOT NULL AND array_length(v_voucher.specific_customer_ids, 1) > 0 THEN
    IF NOT (p_customer_id = ANY(v_voucher.specific_customer_ids)) THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'This voucher is not available for your account'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check per-user usage limit
  SELECT COUNT(*) INTO v_usage_count
  FROM voucher_usage vu
  WHERE vu.voucher_id = v_voucher.id
  AND vu.customer_id = p_customer_id;

  IF v_usage_count >= v_voucher.max_usage_per_user THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'You have already used this voucher the maximum number of times'::TEXT;
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
    'Voucher applied successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ validate_voucher function fixed!';
  RAISE NOTICE 'All column references are now fully qualified.';
END $$;
