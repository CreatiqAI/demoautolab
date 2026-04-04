-- =====================================================
-- FUNCTION: chatbot_lookup_customer
-- Look up customer by phone number to determine:
--   - Whether they are registered
--   - customer_type: 'merchant' or 'normal'
--   - pricing_type to use
-- Used by Product Enquiry chatbot to show correct pricing
-- =====================================================

CREATE OR REPLACE FUNCTION chatbot_lookup_customer(p_phone TEXT)
RETURNS TABLE(
  customer_id UUID,
  customer_name TEXT,
  customer_type TEXT,
  pricing_label TEXT,
  is_registered BOOLEAN
) AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Try customer_profiles first (has customer_type)
  SELECT
    cp.id,
    COALESCE(cp.full_name, cp.name, 'Customer') AS cname,
    cp.customer_type
  INTO v_record
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_record IS NOT NULL THEN
    RETURN QUERY SELECT
      v_record.id,
      v_record.cname,
      v_record.customer_type,
      CASE
        WHEN v_record.customer_type = 'merchant' THEN 'B2B Merchant'
        ELSE 'Retail'
      END,
      true;
    RETURN;
  END IF;

  -- Try profiles table as fallback
  SELECT
    pr.id,
    COALESCE(pr.full_name, 'Customer') AS cname,
    pr.role
  INTO v_record
  FROM profiles pr
  WHERE pr.phone_e164 = p_phone
     OR pr.phone_e164 = '+' || p_phone
     OR pr.phone_e164 = '+6' || p_phone
     OR pr.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_record IS NOT NULL THEN
    RETURN QUERY SELECT
      v_record.id,
      v_record.cname,
      CASE WHEN v_record.role = 'merchant' THEN 'merchant' ELSE 'normal' END,
      CASE WHEN v_record.role = 'merchant' THEN 'B2B Merchant' ELSE 'Retail' END,
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
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer TO anon;
