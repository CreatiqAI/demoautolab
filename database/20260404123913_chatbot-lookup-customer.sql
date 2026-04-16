-- =====================================================
-- FUNCTION: chatbot_lookup_customer
-- Look up customer by phone number to determine:
--   - Whether they are registered
--   - customer_type: 'merchant' or 'normal'
--   - pricing_type to use
-- Used by chatbot to show correct pricing
-- =====================================================

DROP FUNCTION IF EXISTS chatbot_lookup_customer(TEXT);

CREATE OR REPLACE FUNCTION chatbot_lookup_customer(p_phone TEXT)
RETURNS TABLE(
  customer_id UUID,
  customer_name TEXT,
  customer_type TEXT,
  pricing_label TEXT,
  is_registered BOOLEAN
) AS $$
DECLARE
  v_normalized_phone TEXT;
  v_phone_variants TEXT[];
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_type TEXT;
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Normalize incoming phone: strip non-digits
  v_normalized_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');

  -- Build list of phone format variants to match
  v_phone_variants := ARRAY[
    p_phone,
    v_normalized_phone,
    '+' || v_normalized_phone,
    '0' || SUBSTRING(v_normalized_phone FROM 3),  -- 60123456789 -> 0123456789
    SUBSTRING(v_normalized_phone FROM 2)           -- 60123456789 -> 0123456789 variant
  ];

  -- Try customer_profiles first (has customer_type)
  SELECT cp.id, COALESCE(cp.full_name, 'Customer'), cp.customer_type
  INTO v_customer_id, v_customer_name, v_customer_type
  FROM customer_profiles cp
  WHERE cp.phone = ANY(v_phone_variants)
     OR regexp_replace(COALESCE(cp.phone, ''), '\D', '', 'g') = v_normalized_phone
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_customer_id,
      v_customer_name,
      COALESCE(v_customer_type, 'normal'),
      CASE
        WHEN v_customer_type = 'merchant' THEN 'B2B Merchant'
        ELSE 'Retail'
      END,
      true;
    RETURN;
  END IF;

  -- Try profiles table as fallback (uses phone_e164)
  SELECT pr.id, COALESCE(pr.full_name, 'Customer'), pr.role
  INTO v_user_id, v_customer_name, v_role
  FROM profiles pr
  WHERE pr.phone_e164 = ANY(v_phone_variants)
     OR regexp_replace(COALESCE(pr.phone_e164, ''), '\D', '', 'g') = v_normalized_phone
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_user_id,
      v_customer_name,
      CASE WHEN v_role = 'merchant' THEN 'merchant' ELSE 'normal' END,
      CASE WHEN v_role = 'merchant' THEN 'B2B Merchant' ELSE 'Retail' END,
      true;
    RETURN;
  END IF;

  -- Not registered — treat as B2C normal customer
  RETURN QUERY SELECT
    NULL::UUID,
    'Guest'::TEXT,
    'normal'::TEXT,
    'Retail'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer(TEXT) TO authenticated;
