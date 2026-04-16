-- =====================================================
-- COMPLETE FIXED CHATBOT FUNCTIONS
-- Applied via Supabase MCP on 2026-04-16
-- Fixes column mismatches and updates to match actual schema:
--   - customer_profiles uses `phone` (not phone_e164) and `full_name`
--   - products_new has NO prices — components do (component_library)
--   - Cart is user_cart table (single table, no cart header)
-- =====================================================

-- Helper: find user_id by phone
CREATE OR REPLACE FUNCTION _chatbot_find_user_id(p_phone TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_normalized TEXT;
  v_variants TEXT[];
BEGIN
  v_normalized := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_variants := ARRAY[p_phone, v_normalized, '+' || v_normalized, '0' || SUBSTRING(v_normalized FROM 3), SUBSTRING(v_normalized FROM 2)];

  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone = ANY(v_variants)
     OR regexp_replace(COALESCE(cp.phone, ''), '\D', '', 'g') = v_normalized
  LIMIT 1;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- chatbot_lookup_customer
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
  v_normalized_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_phone_variants := ARRAY[
    p_phone, v_normalized_phone,
    '+' || v_normalized_phone,
    '0' || SUBSTRING(v_normalized_phone FROM 3),
    SUBSTRING(v_normalized_phone FROM 2)
  ];

  SELECT cp.id, COALESCE(cp.full_name, 'Customer'), cp.customer_type
  INTO v_customer_id, v_customer_name, v_customer_type
  FROM customer_profiles cp
  WHERE cp.phone = ANY(v_phone_variants)
     OR regexp_replace(COALESCE(cp.phone, ''), '\D', '', 'g') = v_normalized_phone
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_customer_id, v_customer_name,
      COALESCE(v_customer_type, 'normal'),
      CASE WHEN v_customer_type = 'merchant' THEN 'B2B Merchant' ELSE 'Retail' END,
      true;
    RETURN;
  END IF;

  SELECT pr.id, COALESCE(pr.full_name, 'Customer'), pr.role
  INTO v_user_id, v_customer_name, v_role
  FROM profiles pr
  WHERE pr.phone_e164 = ANY(v_phone_variants)
     OR regexp_replace(COALESCE(pr.phone_e164, ''), '\D', '', 'g') = v_normalized_phone
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_user_id, v_customer_name,
      CASE WHEN v_role = 'merchant' THEN 'merchant' ELSE 'normal' END,
      CASE WHEN v_role = 'merchant' THEN 'B2B Merchant' ELSE 'Retail' END,
      true;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::UUID, 'Guest'::TEXT, 'normal'::TEXT, 'Retail'::TEXT, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- chatbot_smart_search (returns components + price ranges)
-- =====================================================
DROP FUNCTION IF EXISTS chatbot_smart_search(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION chatbot_smart_search(p_query TEXT, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
  product_id UUID, product_name TEXT, product_slug TEXT, product_description TEXT,
  category_name TEXT,
  min_normal_price NUMERIC, max_normal_price NUMERIC,
  min_merchant_price NUMERIC, max_merchant_price NUMERIC,
  year_from INTEGER, year_to INTEGER,
  image_url TEXT, stock_available BOOLEAN,
  match_score REAL, components JSONB
) AS $$
DECLARE
  v_query TEXT;
  v_tokens TEXT[];
BEGIN
  v_query := LOWER(TRIM(COALESCE(p_query, '')));

  IF v_query = '' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.slug, LEFT(p.description, 200), cat.name,
      (SELECT MIN(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
      (SELECT MAX(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
      (SELECT MIN(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
      (SELECT MAX(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
      p.year_from, p.year_to,
      (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1),
      EXISTS (SELECT 1 FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true AND cl.stock_level > 0),
      1.0::REAL,
      (SELECT jsonb_agg(jsonb_build_object('sku', cl.component_sku, 'name', cl.name, 'type', cl.component_type, 'normal_price', cl.normal_price, 'merchant_price', cl.merchant_price, 'stock', cl.stock_level, 'in_stock', cl.stock_level > 0, 'remark', pc.remark) ORDER BY pc.display_order)
       FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id AND cl.is_active = true WHERE pc.product_id = p.id)
    FROM products_new p LEFT JOIN categories cat ON cat.id = p.category_id
    WHERE p.active = true AND p.featured = true
    ORDER BY p.updated_at DESC LIMIT p_limit;
    RETURN;
  END IF;

  v_tokens := string_to_array(v_query, ' ');
  v_tokens := ARRAY(SELECT t FROM unnest(v_tokens) t WHERE length(t) > 0);

  RETURN QUERY
  WITH scored_products AS (
    SELECT p.id, p.name, p.slug, LEFT(p.description, 200) AS description, cat.name AS cat_name,
      p.year_from, p.year_to,
      (
        CASE WHEN LOWER(p.name) ILIKE '%' || v_query || '%' THEN 10.0 ELSE 0 END
        + CASE WHEN array_length(v_tokens, 1) > 0 AND (SELECT COUNT(*) FROM unnest(v_tokens) t(tok) WHERE LOWER(p.name) ILIKE '%' || tok || '%') = array_length(v_tokens, 1) THEN 8.0 ELSE 0 END
        + similarity(LOWER(p.name), v_query) * 5.0
        + (SELECT COALESCE(SUM(CASE WHEN LOWER(p.name) ILIKE '%' || tok || '%' THEN 2.0 WHEN similarity(LOWER(p.name), tok) > 0.3 THEN 1.0 ELSE 0 END), 0) FROM unnest(v_tokens) t(tok))
        + CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || v_query || '%' THEN 3.0 WHEN p.model IS NOT NULL AND similarity(LOWER(COALESCE(p.model, '')), v_query) > 0.3 THEN 1.5 ELSE 0 END
        + (SELECT COALESCE(SUM(CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || tok || '%' THEN 2.0 ELSE 0 END), 0) FROM unnest(v_tokens) t(tok))
        + CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
        + CASE WHEN p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%' THEN 1.5 ELSE 0 END
        + CASE WHEN p.keywords IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(p.keywords) kw WHERE LOWER(kw) ILIKE '%' || v_query || '%' OR similarity(LOWER(kw), v_query) > 0.4) THEN 3.0 ELSE 0 END
        + CASE WHEN cat.name IS NOT NULL AND LOWER(cat.name) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
        + CASE WHEN EXISTS (SELECT 1 FROM product_components pc3 JOIN component_library cl3 ON cl3.id = pc3.component_id WHERE pc3.product_id = p.id AND (LOWER(cl3.name) ILIKE '%' || v_query || '%' OR LOWER(cl3.component_sku) ILIKE '%' || v_query || '%' OR similarity(LOWER(cl3.name), v_query) > 0.3)) THEN 3.0 ELSE 0 END
      )::REAL AS score
    FROM products_new p LEFT JOIN categories cat ON cat.id = p.category_id
    WHERE p.active = true
    AND (
      LOWER(p.name) ILIKE '%' || v_query || '%'
      OR similarity(LOWER(p.name), v_query) > 0.15
      OR EXISTS (SELECT 1 FROM unnest(v_tokens) t(tok) WHERE LOWER(p.name) ILIKE '%' || tok || '%' AND length(tok) >= 2)
      OR (p.model IS NOT NULL AND (LOWER(p.model) ILIKE '%' || v_query || '%' OR similarity(LOWER(COALESCE(p.model, '')), v_query) > 0.3))
      OR (p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%')
      OR (p.keywords IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(p.keywords) kw WHERE LOWER(kw) ILIKE '%' || v_query || '%'))
      OR (p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%')
      OR EXISTS (SELECT 1 FROM product_components pc3 JOIN component_library cl3 ON cl3.id = pc3.component_id WHERE pc3.product_id = p.id AND (LOWER(cl3.name) ILIKE '%' || v_query || '%' OR LOWER(cl3.component_sku) ILIKE '%' || v_query || '%'))
    )
  )
  SELECT sp.id, sp.name, sp.slug, sp.description, sp.cat_name,
    (SELECT MIN(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = sp.id AND cl.is_active = true),
    (SELECT MAX(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = sp.id AND cl.is_active = true),
    (SELECT MIN(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = sp.id AND cl.is_active = true),
    (SELECT MAX(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = sp.id AND cl.is_active = true),
    sp.year_from, sp.year_to,
    (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = sp.id AND pi.is_primary = true LIMIT 1),
    EXISTS (SELECT 1 FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = sp.id AND cl.is_active = true AND cl.stock_level > 0),
    sp.score,
    (SELECT jsonb_agg(jsonb_build_object('sku', cl.component_sku, 'name', cl.name, 'type', cl.component_type, 'normal_price', cl.normal_price, 'merchant_price', cl.merchant_price, 'stock', cl.stock_level, 'in_stock', cl.stock_level > 0, 'remark', pc.remark) ORDER BY pc.display_order)
     FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id AND cl.is_active = true WHERE pc.product_id = sp.id)
  FROM scored_products sp WHERE sp.score > 0
  ORDER BY sp.score DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Cart Functions
-- =====================================================
DROP FUNCTION IF EXISTS chatbot_get_cart(TEXT);
CREATE OR REPLACE FUNCTION chatbot_get_cart(p_phone TEXT)
RETURNS TABLE(component_name TEXT, component_sku TEXT, quantity INTEGER, unit_price NUMERIC, line_total NUMERIC, cart_total NUMERIC) AS $$
DECLARE v_user_id UUID; v_total NUMERIC;
BEGIN
  v_user_id := _chatbot_find_user_id(p_phone);
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(uc.total_price), 0) INTO v_total FROM user_cart uc WHERE uc.user_id = v_user_id;
  RETURN QUERY SELECT uc.component_name, uc.component_sku, uc.quantity, uc.unit_price, uc.total_price, v_total
  FROM user_cart uc WHERE uc.user_id = v_user_id ORDER BY uc.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS chatbot_add_to_cart(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION chatbot_add_to_cart(p_phone TEXT, p_component_sku TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS TABLE(success BOOLEAN, message TEXT, cart_item_count BIGINT) AS $$
DECLARE v_user_id UUID; v_customer_type TEXT; v_component RECORD; v_price NUMERIC; v_existing_qty INTEGER; v_count BIGINT;
BEGIN
  v_user_id := _chatbot_find_user_id(p_phone);
  IF v_user_id IS NULL THEN RETURN QUERY SELECT false, 'Please register first at our website.'::TEXT, 0::BIGINT; RETURN; END IF;
  SELECT customer_type INTO v_customer_type FROM customer_profiles WHERE user_id = v_user_id LIMIT 1;
  SELECT cl.id, cl.component_sku, cl.name, cl.normal_price, cl.merchant_price, cl.stock_level, cl.is_active INTO v_component
  FROM component_library cl WHERE cl.component_sku = p_component_sku OR LOWER(cl.component_sku) = LOWER(p_component_sku) LIMIT 1;
  IF v_component.id IS NULL THEN RETURN QUERY SELECT false, 'Component SKU not found: ' || p_component_sku, 0::BIGINT; RETURN; END IF;
  IF NOT v_component.is_active THEN RETURN QUERY SELECT false, 'This component is no longer available.'::TEXT, 0::BIGINT; RETURN; END IF;
  IF v_component.stock_level < p_quantity THEN RETURN QUERY SELECT false, 'Insufficient stock. Available: ' || v_component.stock_level, 0::BIGINT; RETURN; END IF;
  v_price := CASE WHEN v_customer_type = 'merchant' THEN v_component.merchant_price ELSE v_component.normal_price END;
  SELECT quantity INTO v_existing_qty FROM user_cart WHERE user_id = v_user_id AND component_sku = v_component.component_sku;
  IF v_existing_qty IS NOT NULL THEN
    UPDATE user_cart SET quantity = v_existing_qty + p_quantity, total_price = (v_existing_qty + p_quantity) * v_price, updated_at = NOW() WHERE user_id = v_user_id AND component_sku = v_component.component_sku;
  ELSE
    INSERT INTO user_cart (user_id, component_id, component_sku, component_name, quantity, unit_price, total_price)
    VALUES (v_user_id, v_component.id, v_component.component_sku, v_component.name, p_quantity, v_price, p_quantity * v_price);
  END IF;
  SELECT COUNT(*) INTO v_count FROM user_cart WHERE user_id = v_user_id;
  RETURN QUERY SELECT true, 'Added ' || p_quantity || 'x ' || v_component.name || ' (RM' || v_price::TEXT || ' each)', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS chatbot_remove_from_cart(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION chatbot_remove_from_cart(p_phone TEXT, p_component_sku TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS TABLE(success BOOLEAN, message TEXT, cart_item_count BIGINT) AS $$
DECLARE v_user_id UUID; v_existing_qty INTEGER; v_unit_price NUMERIC; v_count BIGINT;
BEGIN
  v_user_id := _chatbot_find_user_id(p_phone);
  IF v_user_id IS NULL THEN RETURN QUERY SELECT false, 'Not registered.'::TEXT, 0::BIGINT; RETURN; END IF;
  SELECT quantity, unit_price INTO v_existing_qty, v_unit_price FROM user_cart WHERE user_id = v_user_id AND component_sku = p_component_sku;
  IF v_existing_qty IS NULL THEN RETURN QUERY SELECT false, 'Item not in cart.'::TEXT, 0::BIGINT; RETURN; END IF;
  IF p_quantity >= v_existing_qty THEN
    DELETE FROM user_cart WHERE user_id = v_user_id AND component_sku = p_component_sku;
  ELSE
    UPDATE user_cart SET quantity = v_existing_qty - p_quantity, total_price = (v_existing_qty - p_quantity) * v_unit_price, updated_at = NOW() WHERE user_id = v_user_id AND component_sku = p_component_sku;
  END IF;
  SELECT COUNT(*) INTO v_count FROM user_cart WHERE user_id = v_user_id;
  RETURN QUERY SELECT true, 'Removed from cart.'::TEXT, v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION chatbot_clear_cart(p_phone TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := _chatbot_find_user_id(p_phone);
  IF v_user_id IS NULL THEN RETURN QUERY SELECT false, 'Not registered.'::TEXT; RETURN; END IF;
  DELETE FROM user_cart WHERE user_id = v_user_id;
  RETURN QUERY SELECT true, 'Cart cleared.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Order Functions
-- =====================================================
DROP FUNCTION IF EXISTS chatbot_get_customer_orders(TEXT);
CREATE OR REPLACE FUNCTION chatbot_get_customer_orders(p_phone TEXT)
RETURNS TABLE(
  order_id UUID, order_no TEXT, status TEXT, payment_state TEXT, total NUMERIC,
  item_count BIGINT, courier_provider TEXT, tracking_number TEXT,
  created_at TIMESTAMPTZ, delivery_method TEXT
) AS $$
DECLARE v_normalized TEXT; v_variants TEXT[];
BEGIN
  v_normalized := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_variants := ARRAY[p_phone, v_normalized, '+' || v_normalized, '0' || SUBSTRING(v_normalized FROM 3), SUBSTRING(v_normalized FROM 2)];
  RETURN QUERY
  SELECT o.id, o.order_no, o.status::TEXT, o.payment_state::TEXT, o.total,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id),
    o.courier_provider::TEXT, o.courier_tracking_number, o.created_at, o.delivery_method::TEXT
  FROM orders o
  WHERE o.customer_phone = ANY(v_variants)
     OR regexp_replace(COALESCE(o.customer_phone, ''), '\D', '', 'g') = v_normalized
  ORDER BY o.created_at DESC LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS chatbot_get_order_details(TEXT);
CREATE OR REPLACE FUNCTION chatbot_get_order_details(p_order_no TEXT)
RETURNS TABLE(
  order_id UUID, order_no TEXT, status TEXT, payment_state TEXT,
  total NUMERIC, subtotal NUMERIC, delivery_fee NUMERIC,
  courier_provider TEXT, tracking_number TEXT, delivery_method TEXT,
  created_at TIMESTAMPTZ, items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_no, o.status::TEXT, o.payment_state::TEXT,
    o.total, o.subtotal, o.delivery_fee,
    o.courier_provider::TEXT, o.courier_tracking_number, o.delivery_method::TEXT,
    o.created_at,
    (SELECT jsonb_agg(jsonb_build_object('name', oi.component_name, 'sku', oi.component_sku, 'qty', oi.quantity, 'price', oi.unit_price, 'total', oi.total_price))
     FROM order_items oi WHERE oi.order_id = o.id)
  FROM orders o
  WHERE o.order_no = p_order_no OR UPPER(o.order_no) = UPPER(p_order_no)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Product Components
-- =====================================================
DROP FUNCTION IF EXISTS chatbot_get_product_components(UUID);
CREATE OR REPLACE FUNCTION chatbot_get_product_components(p_product_id UUID)
RETURNS TABLE(
  component_id UUID, component_sku TEXT, component_name TEXT, component_type TEXT,
  normal_price NUMERIC, merchant_price NUMERIC,
  stock_level INTEGER, image_url TEXT, in_stock BOOLEAN, remark TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT cl.id, cl.component_sku, cl.name, cl.component_type,
    cl.normal_price, cl.merchant_price, cl.stock_level, cl.default_image_url,
    cl.stock_level > 0, pc.remark
  FROM product_components pc
  JOIN component_library cl ON cl.id = pc.component_id
  WHERE pc.product_id = p_product_id AND cl.is_active = true
  ORDER BY pc.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- chatbot_search_products (wrapper with filters)
-- =====================================================
DROP FUNCTION IF EXISTS chatbot_search_products(TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER);
CREATE OR REPLACE FUNCTION chatbot_search_products(
  p_query TEXT DEFAULT NULL, p_car_brand TEXT DEFAULT NULL,
  p_car_model TEXT DEFAULT NULL, p_category_name TEXT DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL, p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  product_id UUID, product_name TEXT, product_slug TEXT, product_description TEXT,
  brand TEXT, model TEXT, category_name TEXT,
  min_normal_price NUMERIC, max_normal_price NUMERIC,
  min_merchant_price NUMERIC, max_merchant_price NUMERIC,
  year_from INTEGER, year_to INTEGER,
  image_url TEXT, stock_available BOOLEAN,
  components JSONB, relevance_score REAL
) AS $$
DECLARE v_search_query TEXT;
BEGIN
  v_search_query := TRIM(CONCAT_WS(' ', p_car_brand, p_car_model, p_query, p_category_name));
  RETURN QUERY
  SELECT p.id, p.name, p.slug, LEFT(p.description, 200), p.brand, p.model, cat.name,
    (SELECT MIN(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
    (SELECT MAX(cl.normal_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
    (SELECT MIN(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
    (SELECT MAX(cl.merchant_price) FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true),
    p.year_from, p.year_to,
    (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1),
    EXISTS (SELECT 1 FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id WHERE pc.product_id = p.id AND cl.is_active = true AND cl.stock_level > 0),
    (SELECT jsonb_agg(jsonb_build_object('sku', cl.component_sku, 'name', cl.name, 'type', cl.component_type, 'normal_price', cl.normal_price, 'merchant_price', cl.merchant_price, 'stock', cl.stock_level, 'in_stock', cl.stock_level > 0, 'remark', pc.remark) ORDER BY pc.display_order)
     FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id AND cl.is_active = true WHERE pc.product_id = p.id),
    GREATEST(
      CASE WHEN v_search_query <> '' THEN similarity(p.name, v_search_query) ELSE 0 END,
      CASE WHEN v_search_query <> '' AND p.brand IS NOT NULL THEN similarity(p.brand, v_search_query) ELSE 0 END,
      CASE WHEN v_search_query <> '' AND p.model IS NOT NULL THEN similarity(p.model, v_search_query) ELSE 0 END
    )::REAL
  FROM products_new p LEFT JOIN categories cat ON cat.id = p.category_id
  WHERE p.active = true
    AND (v_search_query = '' OR p.name ILIKE '%' || v_search_query || '%' OR similarity(p.name, v_search_query) > 0.15)
    AND (p_car_brand IS NULL OR p.brand ILIKE '%' || p_car_brand || '%' OR similarity(COALESCE(p.brand, ''), p_car_brand) > 0.3)
    AND (p_car_model IS NULL OR p.model ILIKE '%' || p_car_model || '%' OR similarity(COALESCE(p.model, ''), p_car_model) > 0.3)
    AND (p_category_name IS NULL OR cat.name ILIKE '%' || p_category_name || '%')
    AND (p_max_price IS NULL OR EXISTS (
      SELECT 1 FROM product_components pc JOIN component_library cl ON cl.id = pc.component_id
      WHERE pc.product_id = p.id AND cl.is_active = true AND cl.normal_price <= p_max_price
    ))
  ORDER BY p.name LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION _chatbot_find_user_id(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_lookup_customer(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_smart_search(TEXT, INTEGER) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_search_products(TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_get_cart(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_add_to_cart(TEXT, TEXT, INTEGER) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_remove_from_cart(TEXT, TEXT, INTEGER) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_clear_cart(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_get_customer_orders(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_get_order_details(TEXT) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION chatbot_get_product_components(UUID) TO service_role, anon, authenticated;
