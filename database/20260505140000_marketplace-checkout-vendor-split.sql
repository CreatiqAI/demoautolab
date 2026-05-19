-- ============================================================================
-- Phase 4: Marketplace checkout vendor split
-- ============================================================================
-- Update create_order_with_items to:
--   1. Copy vendor_id from component_library to each order_items row
--   2. Auto-create vendor_fulfilments (one per distinct vendor on the order)
--   3. Record vendor_sales_ledger entries are deferred until payment SUCCESS
--      (handled by record_vendor_sale_for_order RPC from Phase 6)
-- ============================================================================

DROP FUNCTION IF EXISTS create_order_with_items(jsonb, jsonb);
DROP FUNCTION IF EXISTS create_order_with_items(jsonb, jsonb[]);
DROP FUNCTION IF EXISTS create_order_with_items;

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
  v_vendor_id UUID;
  v_result JSONB;
BEGIN
  v_order_no := 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;

  IF order_data->>'user_id' IS NOT NULL THEN
    SELECT id INTO v_customer_profile_id
    FROM customer_profiles
    WHERE user_id = (order_data->>'user_id')::UUID;
  END IF;

  INSERT INTO orders (
    order_no, user_id, customer_profile_id, customer_name, customer_phone, customer_email,
    delivery_method, delivery_address, delivery_fee, payment_method, payment_state,
    subtotal, tax, discount, shipping_fee, total, status,
    voucher_id, voucher_code, voucher_discount
  ) VALUES (
    v_order_no,
    (order_data->>'user_id')::UUID, v_customer_profile_id,
    order_data->>'customer_name', order_data->>'customer_phone', order_data->>'customer_email',
    order_data->>'delivery_method', (order_data->>'delivery_address')::JSONB, (order_data->>'delivery_fee')::NUMERIC,
    order_data->>'payment_method', COALESCE(order_data->>'payment_state', 'PENDING'),
    (order_data->>'subtotal')::NUMERIC, (order_data->>'tax')::NUMERIC, (order_data->>'discount')::NUMERIC,
    (order_data->>'shipping_fee')::NUMERIC, (order_data->>'total')::NUMERIC,
    COALESCE(order_data->>'status', 'PROCESSING'),
    (order_data->>'voucher_id')::UUID, order_data->>'voucher_code', (order_data->>'voucher_discount')::NUMERIC
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(items_data) LOOP
    -- Resolve component + its vendor (NULL = AutoLab in-house item)
    SELECT id, vendor_id INTO v_component_id, v_vendor_id
    FROM component_library
    WHERE component_sku = v_item->>'component_sku';

    IF v_component_id IS NULL THEN
      RAISE EXCEPTION 'Component with SKU % not found', v_item->>'component_sku';
    END IF;

    INSERT INTO order_items (
      order_id, component_id, vendor_id,
      component_sku, component_name, product_context,
      quantity, unit_price, total_price
    ) VALUES (
      v_order_id, v_component_id, v_vendor_id,
      v_item->>'component_sku', v_item->>'component_name', v_item->>'product_context',
      (v_item->>'quantity')::INTEGER, (v_item->>'unit_price')::NUMERIC, (v_item->>'total_price')::NUMERIC
    );

    UPDATE component_library
    SET stock_level = stock_level - (v_item->>'quantity')::INTEGER, updated_at = NOW()
    WHERE id = v_component_id;

    IF (SELECT stock_level FROM component_library WHERE id = v_component_id) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for component %', v_item->>'component_sku';
    END IF;
  END LOOP;

  -- Auto-create vendor_fulfilments — one per distinct vendor on this order.
  -- Skips AutoLab/in-house items (vendor_id IS NULL) since they use the
  -- existing single-fulfilment flow. UNIQUE(order_id, vendor_id) means this
  -- is naturally idempotent if called twice.
  INSERT INTO vendor_fulfilments (order_id, vendor_id, status)
  SELECT v_order_id, oi.vendor_id, 'PENDING'
  FROM order_items oi
  WHERE oi.order_id = v_order_id
    AND oi.vendor_id IS NOT NULL
  GROUP BY oi.vendor_id
  ON CONFLICT (order_id, vendor_id) DO NOTHING;

  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_no,
    'message', 'Order created successfully'
  );
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object('success', false, 'message', SQLERRM);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO anon;
