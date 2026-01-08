-- Create function to get components with appropriate pricing based on customer type
-- This function checks if a merchant has an active, non-expired subscription
-- Only merchants with active subscriptions see merchant pricing

-- Drop existing function first
DROP FUNCTION IF EXISTS get_components_with_pricing(UUID);

-- Create new function
CREATE OR REPLACE FUNCTION get_components_with_pricing(customer_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  model TEXT,
  image_url TEXT,
  stock_quantity INTEGER,
  normal_price NUMERIC,
  merchant_price NUMERIC,
  price NUMERIC,
  customer_type TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_type TEXT := 'normal';
  v_is_merchant_active BOOLEAN := false;
  v_customer_id UUID;
  v_subscription_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- If user is provided, check their customer type and subscription status
  IF customer_user_id IS NOT NULL THEN
    -- Get customer profile
    SELECT cp.id, cp.customer_type
    INTO v_customer_id, v_customer_type
    FROM customer_profiles cp
    WHERE cp.user_id = customer_user_id;

    -- If customer is a merchant, check if they have an active, non-expired subscription
    IF v_customer_type = 'merchant' AND v_customer_id IS NOT NULL THEN
      SELECT pp.subscription_end_date
      INTO v_subscription_end_date
      FROM premium_partnerships pp
      WHERE pp.merchant_id = v_customer_id
        AND pp.subscription_status = 'ACTIVE'
        AND pp.admin_approved = true
        AND (pp.subscription_plan = 'professional' OR pp.subscription_plan = 'panel')
      LIMIT 1;

      -- Check if subscription exists and is not expired
      IF v_subscription_end_date IS NOT NULL AND v_subscription_end_date > NOW() THEN
        v_is_merchant_active := true;
      END IF;
    END IF;
  END IF;

  -- Return components with appropriate pricing
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.category,
    c.brand,
    c.model,
    c.image_url,
    c.stock_quantity,
    c.normal_price,
    c.merchant_price,
    -- Return merchant price only if merchant has active, non-expired subscription
    CASE
      WHEN v_is_merchant_active AND c.merchant_price IS NOT NULL AND c.merchant_price > 0
      THEN c.merchant_price
      ELSE c.normal_price
    END AS price,
    v_customer_type AS customer_type,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM components c
  WHERE c.is_active = true
  ORDER BY c.category, c.brand, c.name;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_components_with_pricing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_components_with_pricing(UUID) TO anon;

COMMENT ON FUNCTION get_components_with_pricing IS 'Returns components with pricing based on customer type and subscription status. Only active merchants with non-expired subscriptions see merchant pricing.';
