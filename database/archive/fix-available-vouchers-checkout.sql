-- =====================================================
-- ENHANCED: Get Available Vouchers for Checkout
-- =====================================================
-- This function returns ONLY vouchers the customer can actually use
-- considering usage limits and minimum purchase amount

DROP FUNCTION IF EXISTS get_available_vouchers_for_customer(UUID);
DROP FUNCTION IF EXISTS get_available_vouchers_for_checkout(UUID, NUMERIC);

CREATE FUNCTION get_available_vouchers_for_checkout(
  p_customer_id UUID,
  p_order_amount NUMERIC DEFAULT 0
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
  times_used_by_customer INTEGER,
  can_use BOOLEAN
) AS $$
DECLARE
  v_customer_type TEXT;
BEGIN
  -- Get customer type
  SELECT cp.customer_type INTO v_customer_type
  FROM customer_profiles cp
  WHERE cp.id = p_customer_id;

  -- Return available vouchers that customer CAN USE
  RETURN QUERY
  SELECT
    v.id,
    v.code,
    v.name,
    v.description,
    v.discount_type,
    v.discount_value,
    v.max_discount_amount,
    v.min_purchase_amount,
    v.max_usage_per_user,
    v.valid_until,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM voucher_usage vu
      WHERE vu.voucher_id = v.id
      AND vu.customer_id = p_customer_id
    ), 0) as times_used_by_customer,
    true as can_use
  FROM vouchers v
  WHERE v.is_active = true
    -- Must be currently valid (date range)
    AND v.valid_from <= NOW()
    AND (v.valid_until IS NULL OR v.valid_until >= NOW())
    -- Must match customer type
    AND (
      v.customer_type_restriction = 'ALL'
      OR (v.customer_type_restriction = 'NORMAL' AND v_customer_type = 'normal')
      OR (v.customer_type_restriction = 'MERCHANT' AND v_customer_type = 'merchant')
    )
    -- Must match specific customer restriction (if any)
    AND (
      v.specific_customer_ids IS NULL
      OR array_length(v.specific_customer_ids, 1) IS NULL
      OR p_customer_id = ANY(v.specific_customer_ids)
    )
    -- Total usage limit not reached
    AND (
      v.max_usage_total IS NULL
      OR v.current_usage_count < v.max_usage_total
    )
    -- Customer hasn't exceeded their personal usage limit
    AND (
      SELECT COUNT(*)
      FROM voucher_usage vu
      WHERE vu.voucher_id = v.id
      AND vu.customer_id = p_customer_id
    ) < v.max_usage_per_user
    -- Minimum purchase requirement met (if amount provided)
    AND (
      p_order_amount = 0  -- Skip check if no amount provided
      OR p_order_amount >= v.min_purchase_amount
    )
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for My Vouchers page (shows ALL eligible vouchers, even if used up)
CREATE FUNCTION get_available_vouchers_for_customer(
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
  SELECT cp.customer_type INTO v_customer_type
  FROM customer_profiles cp
  WHERE cp.id = p_customer_id;

  -- Return ALL eligible vouchers (including used ones for display purposes)
  RETURN QUERY
  SELECT
    v.id,
    v.code,
    v.name,
    v.description,
    v.discount_type,
    v.discount_value,
    v.max_discount_amount,
    v.min_purchase_amount,
    v.max_usage_per_user,
    v.valid_until,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM voucher_usage vu
      WHERE vu.voucher_id = v.id
      AND vu.customer_id = p_customer_id
    ), 0) as times_used,
    (COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM voucher_usage vu
      WHERE vu.voucher_id = v.id
      AND vu.customer_id = p_customer_id
    ), 0) < v.max_usage_per_user) as can_still_use
  FROM vouchers v
  WHERE v.is_active = true
    -- Must be currently valid (date range)
    AND v.valid_from <= NOW()
    AND (v.valid_until IS NULL OR v.valid_until >= NOW())
    -- Must match customer type
    AND (
      v.customer_type_restriction = 'ALL'
      OR (v.customer_type_restriction = 'NORMAL' AND v_customer_type = 'normal')
      OR (v.customer_type_restriction = 'MERCHANT' AND v_customer_type = 'merchant')
    )
    -- Must match specific customer restriction (if any)
    AND (
      v.specific_customer_ids IS NULL
      OR array_length(v.specific_customer_ids, 1) IS NULL
      OR p_customer_id = ANY(v.specific_customer_ids)
    )
    -- Total usage limit not reached (global limit check)
    AND (
      v.max_usage_total IS NULL
      OR v.current_usage_count < v.max_usage_total
    )
    -- NOTE: We do NOT filter by per-user usage here - show all eligible vouchers
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Available vouchers functions updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'Two functions available:';
  RAISE NOTICE '';
  RAISE NOTICE '1. get_available_vouchers_for_checkout(customer_id, order_amount)';
  RAISE NOTICE '   - Used in: Checkout voucher dropdown';
  RAISE NOTICE '   - Filters: Only vouchers customer can USE NOW';
  RAISE NOTICE '   - Excludes: Vouchers already used max times';
  RAISE NOTICE '   - Excludes: Vouchers not meeting min purchase amount';
  RAISE NOTICE '   Example: SELECT * FROM get_available_vouchers_for_checkout(''...'', 500.00);';
  RAISE NOTICE '';
  RAISE NOTICE '2. get_available_vouchers_for_customer(customer_id)';
  RAISE NOTICE '   - Used in: My Vouchers page';
  RAISE NOTICE '   - Shows: ALL eligible vouchers (even used ones)';
  RAISE NOTICE '   - Purpose: Display usage status, show history';
  RAISE NOTICE '   - Returns: times_used and can_still_use fields';
  RAISE NOTICE '   Example: SELECT * FROM get_available_vouchers_for_customer(''...'');';
  RAISE NOTICE '';
  RAISE NOTICE 'Filters applied to both:';
  RAISE NOTICE '✅ Active vouchers only';
  RAISE NOTICE '✅ Currently valid (within date range)';
  RAISE NOTICE '✅ Matches customer type';
  RAISE NOTICE '✅ Total usage limit not exceeded';
  RAISE NOTICE '✅ Customer-specific restrictions (if any)';
END $$;
