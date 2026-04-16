-- Create function to get user pricing context
-- This function checks if a merchant has an active, non-expired subscription
-- Only merchants with active subscriptions get B2B pricing

-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_pricing_context(UUID);

-- Create new function with correct return type
CREATE OR REPLACE FUNCTION get_user_pricing_context(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_type TEXT;
  v_pricing_mode TEXT;
  v_shows_merchant_price BOOLEAN;
  v_is_active BOOLEAN;
  v_subscription_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get customer profile
  SELECT id, email, customer_type
  INTO v_customer_id, v_customer_name, v_customer_type
  FROM customer_profiles
  WHERE user_id = p_user_id;

  -- If no customer profile found, return default (normal customer)
  IF v_customer_id IS NULL THEN
    RETURN json_build_object(
      'user_id', p_user_id,
      'customer_id', NULL,
      'customer_name', NULL,
      'customer_type', 'normal',
      'pricing_mode', 'B2C',
      'shows_merchant_price', false,
      'is_active', false
    );
  END IF;

  -- If customer is not a merchant, return B2C pricing
  IF v_customer_type != 'merchant' THEN
    RETURN json_build_object(
      'user_id', p_user_id,
      'customer_id', v_customer_id,
      'customer_name', v_customer_name,
      'customer_type', 'normal',
      'pricing_mode', 'B2C',
      'shows_merchant_price', false,
      'is_active', false
    );
  END IF;

  -- For merchants, check if they have an active, non-expired subscription
  SELECT subscription_end_date
  INTO v_subscription_end_date
  FROM premium_partnerships
  WHERE merchant_id = v_customer_id
    AND subscription_status = 'ACTIVE'
    AND admin_approved = true
    AND (subscription_plan = 'professional' OR subscription_plan = 'panel')
  LIMIT 1;

  -- Check if subscription exists and is not expired
  IF v_subscription_end_date IS NOT NULL AND v_subscription_end_date > NOW() THEN
    -- Active merchant with valid subscription gets B2B pricing
    v_pricing_mode := 'B2B';
    v_shows_merchant_price := true;
    v_is_active := true;
  ELSE
    -- Merchant with expired or no subscription gets B2C pricing
    v_pricing_mode := 'B2C';
    v_shows_merchant_price := false;
    v_is_active := false;
  END IF;

  RETURN json_build_object(
    'user_id', p_user_id,
    'customer_id', v_customer_id,
    'customer_name', v_customer_name,
    'customer_type', v_customer_type,
    'pricing_mode', v_pricing_mode,
    'shows_merchant_price', v_shows_merchant_price,
    'is_active', v_is_active
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_pricing_context(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_pricing_context IS 'Returns pricing context for a user, checking if merchant subscription is active and not expired';
