-- ============================================
-- FIX: Update create_order_with_items function
-- to work with new automated order system
-- ============================================

-- Drop ALL existing versions of the function (fix overloading issue)
DROP FUNCTION IF EXISTS create_order_with_items(jsonb, jsonb);
DROP FUNCTION IF EXISTS create_order_with_items(jsonb, jsonb[]);
DROP FUNCTION IF EXISTS create_order_with_items;

-- Recreate function with updated payment_state values
CREATE OR REPLACE FUNCTION create_order_with_items(
  order_data JSONB,
  items_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_no TEXT;
  v_customer_profile_id UUID;
  v_item JSONB;
  v_component_id UUID;
  v_result JSONB;
BEGIN
  -- Generate order number
  v_order_no := 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;

  -- Get customer profile ID from user_id
  IF order_data->>'user_id' IS NOT NULL THEN
    SELECT id INTO v_customer_profile_id
    FROM customer_profiles
    WHERE user_id = (order_data->>'user_id')::UUID;
  END IF;

  -- Insert order with new payment_state values
  INSERT INTO orders (
    order_no,
    user_id,
    customer_profile_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_method,
    delivery_address,
    delivery_fee,
    payment_method,
    payment_state,  -- Using new values: PENDING, PROCESSING, SUCCESS, FAILED
    subtotal,
    tax,
    discount,
    shipping_fee,
    total,
    status,  -- Using new values: PROCESSING, PICKING, PACKING, etc.
    voucher_id,
    voucher_code,
    voucher_discount
  ) VALUES (
    v_order_no,
    (order_data->>'user_id')::UUID,
    v_customer_profile_id,
    order_data->>'customer_name',
    order_data->>'customer_phone',
    order_data->>'customer_email',
    order_data->>'delivery_method',
    (order_data->>'delivery_address')::JSONB,
    (order_data->>'delivery_fee')::NUMERIC,
    order_data->>'payment_method',
    COALESCE(order_data->>'payment_state', 'PENDING'),  -- Default to PENDING if not provided
    (order_data->>'subtotal')::NUMERIC,
    (order_data->>'tax')::NUMERIC,
    (order_data->>'discount')::NUMERIC,
    (order_data->>'shipping_fee')::NUMERIC,
    (order_data->>'total')::NUMERIC,
    COALESCE(order_data->>'status', 'PROCESSING'),  -- Default to PROCESSING if not provided
    (order_data->>'voucher_id')::UUID,
    order_data->>'voucher_code',
    (order_data->>'voucher_discount')::NUMERIC
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and update inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(items_data)
  LOOP
    -- Get component_id from SKU (component_library is the actual components table)
    SELECT id INTO v_component_id
    FROM component_library
    WHERE component_sku = v_item->>'component_sku';

    IF v_component_id IS NULL THEN
      RAISE EXCEPTION 'Component with SKU % not found', v_item->>'component_sku';
    END IF;

    -- Insert order item
    INSERT INTO order_items (
      order_id,
      component_id,
      component_sku,
      component_name,
      product_context,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_component_id,
      v_item->>'component_sku',
      v_item->>'component_name',
      v_item->>'product_context',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC
    );

    -- Deduct inventory from stock_level column
    UPDATE component_library
    SET
      stock_level = stock_level - (v_item->>'quantity')::INTEGER,
      updated_at = NOW()
    WHERE id = v_component_id;

    -- Check if stock went negative
    IF (SELECT stock_level FROM component_library WHERE id = v_component_id) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for component %', v_item->>'component_sku';
    END IF;
  END LOOP;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_no,
    'message', 'Order created successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    v_result := jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO anon;

SELECT 'create_order_with_items function updated successfully' as status;
