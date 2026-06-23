-- ============================================================================
-- Server-side FOC guard in create_order_with_items
-- ----------------------------------------------------------------------------
-- Defense-in-depth for the free-of-charge bundle feature: a free (RM0) line is
-- only legitimate when a paid item from the SAME product is also in the order
-- (the "main item" that unlocks the gift). This drops any free line whose main
-- item was removed, so a gift can never be claimed for free on its own — even if
-- a crafted request bypasses the client. Also rejects orders left with no
-- payable items after the guard runs.
--
-- Only the guard block (+ empty-order check) is added; the rest of the function
-- is reproduced verbatim from the deployed definition.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order_with_items(order_data jsonb, items_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today TEXT;
  v_base_seq INTEGER;
  v_base_no TEXT;
  v_group_id UUID := gen_random_uuid();
  v_customer_profile_id UUID;
  v_user_id UUID;
  v_total_voucher NUMERIC := COALESCE((order_data->>'voucher_discount')::NUMERIC, 0);
  v_voucher_id UUID := (order_data->>'voucher_id')::UUID;
  v_voucher_code TEXT := order_data->>'voucher_code';
  v_payment_state TEXT := COALESCE(order_data->>'payment_state', 'PENDING');
  v_status TEXT := COALESCE(order_data->>'status', 'PROCESSING');
  v_payment_method TEXT := order_data->>'payment_method';
  v_default_method TEXT := COALESCE(order_data->>'delivery_method', 'jt');
  v_delivery_address JSONB := (order_data->>'delivery_address')::JSONB;
  v_customer_name TEXT := order_data->>'customer_name';
  v_customer_phone TEXT := order_data->>'customer_phone';
  v_customer_email TEXT := order_data->>'customer_email';
  v_shipping_map JSONB := COALESCE(order_data->'shipping_methods', '{}'::JSONB);
  v_seller_count INT;
  v_use_suffix BOOLEAN;
  v_letter_idx INT;
  v_seller RECORD;
  v_order_id UUID;
  v_order_no TEXT;
  v_seller_subtotal NUMERIC;
  v_seller_tax NUMERIC;
  v_seller_total NUMERIC;
  v_seller_shipping_fee NUMERIC;
  v_seller_method TEXT;
  v_seller_voucher NUMERIC;
  v_item JSONB;
  v_orders_out JSONB := '[]'::JSONB;
  v_first_order_id UUID := NULL;
  v_first_order_no TEXT := NULL;
  v_seller_key TEXT;
BEGIN
  v_user_id := (order_data->>'user_id')::UUID;
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_customer_profile_id FROM customer_profiles WHERE user_id = v_user_id;
  END IF;

  v_today := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYYMMDD');
  PERFORM pg_advisory_xact_lock(hashtext('order_no_' || v_today));
  SELECT COALESCE(MAX((REGEXP_MATCH(order_no, '^ORD-\d{8}-(\d+)(?:-[A-Z])?$'))[1]::INTEGER), 0) + 1
    INTO v_base_seq
    FROM orders
    WHERE order_no ~ ('^ORD-' || v_today || '-\d+(-[A-Z])?$');
  v_base_no := 'ORD-' || v_today || '-' || LPAD(v_base_seq::TEXT, 4, '0');

  CREATE TEMP TABLE _staged_items ON COMMIT DROP AS
  SELECT
    (it->>'component_sku')::TEXT       AS component_sku,
    (it->>'component_name')::TEXT      AS component_name,
    (it->>'product_context')::TEXT     AS product_context,
    (it->>'quantity')::INTEGER         AS quantity,
    (it->>'unit_price')::NUMERIC       AS unit_price,
    (it->>'total_price')::NUMERIC      AS total_price,
    cl.id                              AS component_id,
    cl.vendor_id                       AS vendor_id
  FROM jsonb_array_elements(items_data) AS it
  JOIN component_library cl ON cl.component_sku = (it->>'component_sku');

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items_data) it
             WHERE NOT EXISTS (SELECT 1 FROM component_library WHERE component_sku = it->>'component_sku')) THEN
    RAISE EXCEPTION 'One or more SKUs not found in component_library';
  END IF;

  -- FOC guard: drop free (RM0) lines that have no paid sibling from the same
  -- product in this order. Stops a free gift being claimed without its main item.
  DELETE FROM _staged_items s
  WHERE s.unit_price = 0
    AND NOT EXISTS (
      SELECT 1 FROM _staged_items p
      WHERE p.unit_price > 0
        AND p.product_context = s.product_context
    );

  IF NOT EXISTS (SELECT 1 FROM _staged_items) THEN
    RAISE EXCEPTION 'No payable items in order';
  END IF;

  SELECT COUNT(DISTINCT COALESCE(vendor_id::TEXT, 'autolab')) INTO v_seller_count FROM _staged_items;
  v_use_suffix := v_seller_count > 1;

  v_letter_idx := 0;
  FOR v_seller IN
    SELECT
      vendor_id,
      COALESCE(vendor_id::TEXT, 'autolab') AS seller_key
    FROM _staged_items
    GROUP BY vendor_id
    ORDER BY (vendor_id IS NOT NULL),
             (SELECT business_name FROM vendors WHERE id = _staged_items.vendor_id)
  LOOP
    v_letter_idx := v_letter_idx + 1;
    v_seller_key := v_seller.seller_key;

    -- Per-seller subtotal (sum of items × qty for this seller)
    SELECT COALESCE(SUM(total_price), 0)
      INTO v_seller_subtotal
      FROM _staged_items
      WHERE COALESCE(vendor_id::TEXT, 'autolab') = v_seller_key;

    -- Per-seller method + fee from frontend's shipping_methods map.
    -- Falls back to default for legacy callers.
    v_seller_method := COALESCE(
      v_shipping_map->v_seller_key->>'method',
      v_default_method
    );
    v_seller_shipping_fee := COALESCE(
      (v_shipping_map->v_seller_key->>'fee')::NUMERIC,
      CASE
        -- Legacy fallback: AutoLab uses cart-level delivery_fee, vendor uses default_shipping_fee
        WHEN v_seller.vendor_id IS NULL THEN COALESCE((order_data->>'delivery_fee')::NUMERIC, 0)
        ELSE COALESCE((SELECT default_shipping_fee FROM vendors WHERE id = v_seller.vendor_id), 0)
      END
    );

    -- Voucher only applies to AutoLab slice
    v_seller_voucher := CASE WHEN v_seller.vendor_id IS NULL THEN v_total_voucher ELSE 0 END;

    -- SST 6% on (subtotal - voucher)
    v_seller_tax := ROUND(GREATEST(v_seller_subtotal - v_seller_voucher, 0) * 0.06, 2);

    v_seller_total := v_seller_subtotal - v_seller_voucher + v_seller_tax + v_seller_shipping_fee;

    v_order_no := CASE
      WHEN v_use_suffix THEN v_base_no || '-' || CHR(64 + v_letter_idx)
      ELSE v_base_no
    END;

    INSERT INTO orders (
      order_no, user_id, customer_profile_id, customer_name, customer_phone, customer_email,
      delivery_method, delivery_address, delivery_fee, payment_method, payment_state,
      subtotal, tax, discount, shipping_fee, total, status,
      voucher_id, voucher_code, voucher_discount,
      order_group_id, seller_letter, seller_vendor_id
    ) VALUES (
      v_order_no, v_user_id, v_customer_profile_id, v_customer_name, v_customer_phone, v_customer_email,
      v_seller_method, v_delivery_address, v_seller_shipping_fee, v_payment_method, v_payment_state,
      v_seller_subtotal, v_seller_tax, 0, v_seller_shipping_fee, v_seller_total, v_status,
      CASE WHEN v_seller.vendor_id IS NULL THEN v_voucher_id ELSE NULL END,
      CASE WHEN v_seller.vendor_id IS NULL THEN v_voucher_code ELSE NULL END,
      v_seller_voucher,
      CASE WHEN v_use_suffix THEN v_group_id ELSE NULL END,
      CASE WHEN v_use_suffix THEN CHR(64 + v_letter_idx) ELSE NULL END,
      v_seller.vendor_id
    ) RETURNING id INTO v_order_id;

    IF v_first_order_id IS NULL THEN
      v_first_order_id := v_order_id;
      v_first_order_no := v_order_no;
    END IF;

    FOR v_item IN
      SELECT to_jsonb(t) FROM (
        SELECT component_id, vendor_id, component_sku, component_name, product_context,
               quantity, unit_price, total_price
        FROM _staged_items
        WHERE COALESCE(vendor_id::TEXT, 'autolab') = v_seller_key
      ) t
    LOOP
      INSERT INTO order_items (
        order_id, component_id, vendor_id,
        component_sku, component_name, product_context,
        quantity, unit_price, total_price
      ) VALUES (
        v_order_id,
        (v_item->>'component_id')::UUID,
        (v_item->>'vendor_id')::UUID,
        v_item->>'component_sku', v_item->>'component_name', v_item->>'product_context',
        (v_item->>'quantity')::INTEGER,
        (v_item->>'unit_price')::NUMERIC,
        (v_item->>'total_price')::NUMERIC
      );

      UPDATE component_library
      SET stock_level = stock_level - (v_item->>'quantity')::INTEGER, updated_at = NOW()
      WHERE id = (v_item->>'component_id')::UUID;
      IF (SELECT stock_level FROM component_library WHERE id = (v_item->>'component_id')::UUID) < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for component %', v_item->>'component_sku';
      END IF;
    END LOOP;

    -- Vendor sub-orders also create a vendor_fulfilments row, carrying the
    -- shipping_fee + delivery_method so the vendor sees what was paid for.
    IF v_seller.vendor_id IS NOT NULL THEN
      INSERT INTO vendor_fulfilments (order_id, vendor_id, status, shipping_fee, tracking_provider)
      VALUES (
        v_order_id,
        v_seller.vendor_id,
        'PENDING',
        v_seller_shipping_fee,
        v_seller_method
      )
      ON CONFLICT (order_id, vendor_id) DO NOTHING;
    END IF;

    v_orders_out := v_orders_out || jsonb_build_object(
      'order_id', v_order_id,
      'order_no', v_order_no,
      'seller_letter', CASE WHEN v_use_suffix THEN CHR(64 + v_letter_idx) ELSE NULL END,
      'vendor_id', v_seller.vendor_id,
      'subtotal', v_seller_subtotal,
      'shipping_fee', v_seller_shipping_fee,
      'delivery_method', v_seller_method,
      'total', v_seller_total
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_first_order_id,
    'order_number', v_first_order_no,
    'order_group_id', CASE WHEN v_use_suffix THEN v_group_id ELSE NULL END,
    'orders', v_orders_out,
    'split', v_use_suffix,
    'message', 'Order created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
