-- =====================================================
-- QUICK FIX: Get Available Vouchers Function
-- =====================================================
-- Drop and recreate with fully qualified column names

DROP FUNCTION IF EXISTS get_available_vouchers_for_customer(UUID);

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

  -- Return available vouchers
  RETURN QUERY
  SELECT
    vouchers.id,
    vouchers.code,
    vouchers.name,
    vouchers.description,
    vouchers.discount_type,
    vouchers.discount_value,
    vouchers.max_discount_amount,
    vouchers.min_purchase_amount,
    vouchers.max_usage_per_user,
    vouchers.valid_until,
    (SELECT COUNT(*)::INTEGER
     FROM voucher_usage vu
     WHERE vu.voucher_id = vouchers.id
     AND vu.customer_id = p_customer_id) as times_used,
    ((SELECT COUNT(*)::INTEGER
      FROM voucher_usage vu
      WHERE vu.voucher_id = vouchers.id
      AND vu.customer_id = p_customer_id) < vouchers.max_usage_per_user) as can_still_use
  FROM vouchers
  WHERE vouchers.is_active = true
    AND vouchers.valid_from <= NOW()
    AND (vouchers.valid_until IS NULL OR vouchers.valid_until >= NOW())
    AND (
      vouchers.customer_type_restriction = 'ALL'
      OR (vouchers.customer_type_restriction = 'NORMAL' AND v_customer_type = 'normal')
      OR (vouchers.customer_type_restriction = 'MERCHANT' AND v_customer_type = 'merchant')
    )
    AND (
      vouchers.specific_customer_ids IS NULL
      OR p_customer_id = ANY(vouchers.specific_customer_ids)
    )
    AND (
      vouchers.max_usage_total IS NULL
      OR vouchers.current_usage_count < vouchers.max_usage_total
    )
  ORDER BY vouchers.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Test it
DO $$
BEGIN
  RAISE NOTICE '✅ Function get_available_vouchers_for_customer recreated successfully!';
  RAISE NOTICE 'Test by running: SELECT * FROM get_available_vouchers_for_customer(''your-customer-id'');';
END $$;
