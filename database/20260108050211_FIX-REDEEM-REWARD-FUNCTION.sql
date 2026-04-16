-- Fix redeem_reward_item Function to use correct voucher column names

DROP FUNCTION IF EXISTS redeem_reward_item(UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION redeem_reward_item(
  p_customer_id UUID,
  p_reward_item_id UUID,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_points_required INTEGER;
  v_item_type VARCHAR(50);
  v_item_name VARCHAR(255);
  v_stock_quantity INTEGER;
  v_max_redemptions INTEGER;
  v_customer_redemptions INTEGER;
  v_total_redemption_limit INTEGER;
  v_total_redeemed INTEGER;
  v_redemption_id UUID;
  v_voucher_id UUID;
  v_voucher_code VARCHAR(50);
  v_voucher_discount_type VARCHAR(20);
  v_voucher_discount_value NUMERIC;
  v_voucher_min_purchase NUMERIC;
  v_voucher_validity_days INTEGER;
  v_expiry_date TIMESTAMP;
BEGIN
  -- Get customer's current balance
  v_current_balance := get_customer_points_balance(p_customer_id);

  -- Get reward item details
  SELECT
    points_required, item_type, name, stock_quantity,
    max_redemptions_per_customer, total_redemption_limit, total_redeemed,
    voucher_code_prefix, voucher_discount_type, voucher_discount_value,
    voucher_min_purchase, voucher_validity_days
  INTO
    v_points_required, v_item_type, v_item_name, v_stock_quantity,
    v_max_redemptions, v_total_redemption_limit, v_total_redeemed,
    v_voucher_code, v_voucher_discount_type, v_voucher_discount_value,
    v_voucher_min_purchase, v_voucher_validity_days
  FROM reward_items
  WHERE id = p_reward_item_id
    AND is_active = true
    AND (available_from IS NULL OR available_from <= NOW())
    AND (available_until IS NULL OR available_until >= NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward item not found or not available');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient points',
      'required', v_points_required,
      'available', v_current_balance
    );
  END IF;

  -- Check stock for merchandise
  IF v_item_type = 'MERCHANDISE' AND v_stock_quantity IS NOT NULL AND v_stock_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item out of stock');
  END IF;

  -- Check per-customer redemption limit
  IF v_max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_redemptions
    FROM point_redemptions
    WHERE customer_id = p_customer_id
      AND reward_item_id = p_reward_item_id
      AND status IN ('PENDING', 'COMPLETED');

    IF v_customer_redemptions >= v_max_redemptions THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum redemptions per customer reached');
    END IF;
  END IF;

  -- Check total redemption limit
  IF v_total_redemption_limit IS NOT NULL AND v_total_redeemed >= v_total_redemption_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Total redemption limit reached');
  END IF;

  -- Create redemption record
  INSERT INTO point_redemptions (
    customer_id,
    reward_item_id,
    points_spent,
    status,
    shipping_address
  ) VALUES (
    p_customer_id,
    p_reward_item_id,
    v_points_required,
    'PENDING',
    p_shipping_address
  ) RETURNING id INTO v_redemption_id;

  -- Deduct points from ledger
  INSERT INTO customer_points_ledger (
    customer_id,
    transaction_type,
    points_amount,
    redemption_id,
    description
  ) VALUES (
    p_customer_id,
    'REDEEMED',
    -v_points_required,
    v_redemption_id,
    'Redeemed: ' || v_item_name
  );

  -- If voucher, generate voucher code
  IF v_item_type = 'VOUCHER' THEN
    -- Generate unique voucher code
    v_voucher_code := v_voucher_code || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    v_expiry_date := NOW() + (v_voucher_validity_days || ' days')::INTERVAL;

    -- FIXED: Use correct column names for vouchers table
    INSERT INTO vouchers (
      code,
      name,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_usage_per_user,        -- FIXED: was usage_limit
      current_usage_count,        -- FIXED: was times_used
      valid_from,
      valid_until,
      is_active,
      specific_customer_ids,      -- FIXED: assign to specific customer
      customer_type_restriction,  -- FIXED: must be 'ALL' to show in My Vouchers
      admin_notes
    ) VALUES (
      v_voucher_code,
      'Points Reward: ' || v_item_name,
      -- FIXED: Map discount type to match vouchers table constraint
      CASE
        WHEN v_voucher_discount_type = 'FIXED' THEN 'FIXED_AMOUNT'
        ELSE v_voucher_discount_type
      END,
      v_voucher_discount_value,
      v_voucher_min_purchase,
      1,                          -- Single use per customer
      0,                          -- Not used yet
      NOW(),
      v_expiry_date,
      true,
      ARRAY[p_customer_id],       -- Only this customer can use it
      'ALL',                      -- Allow all customer types to use it
      'Generated from points redemption'
    ) RETURNING id INTO v_voucher_id;

    -- Update redemption with voucher
    UPDATE point_redemptions
    SET
      generated_voucher_id = v_voucher_id,
      status = 'COMPLETED'
    WHERE id = v_redemption_id;

    -- Update total redeemed count
    UPDATE reward_items
    SET total_redeemed = COALESCE(total_redeemed, 0) + 1
    WHERE id = p_reward_item_id;

    RETURN jsonb_build_object(
      'success', true,
      'redemption_id', v_redemption_id,
      'voucher_code', v_voucher_code,
      'voucher_id', v_voucher_id,
      'expiry_date', v_expiry_date,
      'new_balance', get_customer_points_balance(p_customer_id)
    );
  ELSE
    -- For merchandise, reduce stock
    IF v_stock_quantity IS NOT NULL THEN
      UPDATE reward_items
      SET
        stock_quantity = stock_quantity - 1,
        total_redeemed = COALESCE(total_redeemed, 0) + 1
      WHERE id = p_reward_item_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'redemption_id', v_redemption_id,
      'message', 'Redemption successful. Item will be shipped to your address.',
      'new_balance', get_customer_points_balance(p_customer_id)
    );
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION redeem_reward_item(UUID, UUID, JSONB) TO authenticated, anon;

SELECT '✅ redeem_reward_item function fixed with correct voucher column names!' as result;
