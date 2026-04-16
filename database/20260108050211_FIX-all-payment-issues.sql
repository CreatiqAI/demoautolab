-- ============================================
-- FIX: All Payment and Order Issues
-- ============================================

-- 1. Fix order number generation (remove decimal timestamp)
DROP FUNCTION IF EXISTS create_order_with_items(jsonb, jsonb);

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
  v_today TEXT;
  v_today_count INTEGER;
BEGIN
  -- Generate order number with daily incremental counter: ORD-20251230-0001
  v_today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get count of orders created today
  SELECT COUNT(*) INTO v_today_count
  FROM orders
  WHERE order_no LIKE 'ORD-' || v_today || '-%';

  -- Increment counter and format as 4-digit zero-padded
  v_order_no := 'ORD-' || v_today || '-' || LPAD((v_today_count + 1)::TEXT, 4, '0');

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
    payment_state,
    subtotal,
    tax,
    discount,
    shipping_fee,
    total,
    status,
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
    COALESCE(order_data->>'payment_state', 'PENDING'),
    (order_data->>'subtotal')::NUMERIC,
    (order_data->>'tax')::NUMERIC,
    (order_data->>'discount')::NUMERIC,
    (order_data->>'shipping_fee')::NUMERIC,
    (order_data->>'total')::NUMERIC,
    COALESCE(order_data->>'status', 'PROCESSING'),
    (order_data->>'voucher_id')::UUID,
    order_data->>'voucher_code',
    (order_data->>'voucher_discount')::NUMERIC
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and update inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(items_data)
  LOOP
    -- Get component_id from SKU
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

    -- Deduct inventory
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
    v_result := jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO anon;


-- 2. Fix or create process_payment_response function with new payment states
DROP FUNCTION IF EXISTS process_payment_response(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION process_payment_response(
  p_order_id UUID,
  p_status TEXT,
  p_payment_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_new_payment_state TEXT;
  v_new_status TEXT;
BEGIN
  -- Map payment status to new payment_state values
  IF p_status = 'success' OR p_status = 'SUCCESS' THEN
    v_new_payment_state := 'SUCCESS';
    v_new_status := 'PROCESSING';  -- Auto-approved by trigger
  ELSIF p_status = 'failed' OR p_status = 'FAILED' OR p_status = 'unsuccessful' THEN
    v_new_payment_state := 'FAILED';
    v_new_status := 'PAYMENT_FAILED';
  ELSE
    v_new_payment_state := 'PROCESSING';
    v_new_status := 'PROCESSING';
  END IF;

  -- Update order with new payment state
  UPDATE orders
  SET
    payment_state = v_new_payment_state,
    status = v_new_status,
    payment_gateway_response = p_payment_details,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_state', v_new_payment_state,
    'status', v_new_status,
    'message', 'Payment processed successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_payment_response(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_response(UUID, TEXT, JSONB) TO anon;


-- 3. Update warehouse RPC to only show SUCCESS payment orders
DROP FUNCTION IF EXISTS get_warehouse_orders(TEXT);

CREATE OR REPLACE FUNCTION get_warehouse_orders(warehouse_status TEXT DEFAULT 'PROCESSING')
RETURNS TABLE (
  id UUID,
  order_no TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  delivery_method TEXT,
  delivery_address JSONB,
  total NUMERIC,
  status TEXT,
  payment_state TEXT,
  created_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  order_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_no,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.delivery_method,
    o.delivery_address,
    o.total,
    o.status,
    o.payment_state,
    o.created_at,
    o.processing_started_at,
    (
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'component_sku', oi.component_sku,
        'component_name', oi.component_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    )::JSONB as order_items
  FROM orders o
  WHERE o.status = warehouse_status
  AND o.payment_state = 'SUCCESS'  -- CRITICAL: Only show paid orders
  ORDER BY o.created_at ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_warehouse_orders(TEXT) TO authenticated;

SELECT 'All payment issues fixed!' as status;
