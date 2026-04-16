-- =====================================================
-- VOUCHER SYSTEM - Complete Implementation
-- =====================================================

-- 1. Create Vouchers Table
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Discount Configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC(10,2), -- For percentage discounts, cap the discount

  -- Usage Requirements
  min_purchase_amount NUMERIC(10,2) DEFAULT 0,
  max_usage_total INTEGER, -- Total times this voucher can be used across all users
  max_usage_per_user INTEGER DEFAULT 1, -- Times each user can use this voucher
  current_usage_count INTEGER DEFAULT 0,

  -- User Restrictions
  customer_type_restriction TEXT CHECK (customer_type_restriction IN ('ALL', 'NORMAL', 'MERCHANT')),
  specific_customer_ids UUID[], -- If set, only these customers can use it

  -- Validity Period
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notes for admin
  admin_notes TEXT
);

-- 2. Create Voucher Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_profiles(id),
  order_id UUID REFERENCES orders(id),

  -- Usage Details
  discount_applied NUMERIC(10,2) NOT NULL,
  order_amount NUMERIC(10,2) NOT NULL,

  -- Timestamps
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(voucher_id, order_id) -- Prevent same voucher being applied twice to same order
);

-- 3. Add voucher columns to orders table
DO $$
BEGIN
  -- Add voucher_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN voucher_id UUID REFERENCES vouchers(id);
  END IF;

  -- Add voucher_code if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN voucher_code TEXT;
  END IF;

  -- Add voucher_discount if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_discount'
  ) THEN
    ALTER TABLE orders ADD COLUMN voucher_discount NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- 4. Create function to validate voucher
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

-- 5. Create function to apply voucher to order
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
  WHERE UPPER(code) = UPPER(p_voucher_code);

  IF v_voucher_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update order with voucher details
  UPDATE orders
  SET
    voucher_id = v_voucher_id,
    voucher_code = p_voucher_code,
    voucher_discount = p_discount_amount,
    total_amount = total_amount - p_discount_amount
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
  );

  -- Increment voucher usage count
  UPDATE vouchers
  SET current_usage_count = current_usage_count + 1
  WHERE id = v_voucher_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_validity ON vouchers(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_customer ON voucher_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_orders_voucher ON orders(voucher_id);

-- 7. Insert sample vouchers for testing
INSERT INTO vouchers (
  code,
  name,
  description,
  discount_type,
  discount_value,
  max_discount_amount,
  min_purchase_amount,
  max_usage_total,
  max_usage_per_user,
  customer_type_restriction,
  valid_until,
  is_active
) VALUES
(
  'WELCOME10',
  'Welcome Discount 10%',
  'Get 10% off your first order',
  'PERCENTAGE',
  10,
  50, -- Max RM 50 discount
  100, -- Min purchase RM 100
  1000, -- 1000 total uses
  1, -- Once per user
  'ALL',
  NOW() + INTERVAL '30 days',
  true
),
(
  'SAVE50',
  'RM 50 Off',
  'Flat RM 50 discount on orders above RM 500',
  'FIXED_AMOUNT',
  50,
  NULL,
  500, -- Min purchase RM 500
  500, -- 500 total uses
  3, -- Up to 3 times per user
  'ALL',
  NOW() + INTERVAL '60 days',
  true
),
(
  'MERCHANT20',
  'Merchant Special 20%',
  'Exclusive 20% discount for merchant customers',
  'PERCENTAGE',
  20,
  200, -- Max RM 200 discount
  300, -- Min purchase RM 300
  NULL, -- Unlimited uses
  5, -- 5 times per merchant
  'MERCHANT',
  NOW() + INTERVAL '90 days',
  true
);

-- 8. Disable RLS temporarily for testing (as per your preference)
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage DISABLE ROW LEVEL SECURITY;

-- 9. Create function to get available vouchers for a customer
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
    COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM voucher_usage vu
       WHERE vu.voucher_id = v.id
       AND vu.customer_id = p_customer_id),
      0
    ) as times_used,
    COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM voucher_usage vu
       WHERE vu.voucher_id = v.id
       AND vu.customer_id = p_customer_id),
      0
    ) < v.max_usage_per_user as can_still_use
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

-- 10. Grant permissions
GRANT ALL ON vouchers TO authenticated;
GRANT ALL ON voucher_usage TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Voucher system created successfully!';
  RAISE NOTICE 'Sample vouchers added: WELCOME10, SAVE50, MERCHANT20';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  - validate_voucher(code, customer_id, order_amount)';
  RAISE NOTICE '  - apply_voucher_to_order(order_id, code, customer_id, order_amount, discount)';
  RAISE NOTICE '  - get_available_vouchers_for_customer(customer_id)';
END $$;
