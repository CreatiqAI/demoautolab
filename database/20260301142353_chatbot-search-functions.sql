-- =====================================================
-- CHATBOT SMART SEARCH FUNCTIONS
-- For n8n WhatsApp Chatbot Integration
-- =====================================================

-- 1. Enable pg_trgm extension for fuzzy/typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add trigram indexes for fuzzy search on products_new
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products_new USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
  ON products_new USING gin(brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_model_trgm
  ON products_new USING gin(model gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products_new USING gin(description gin_trgm_ops);

-- 3. Add trigram indexes on component_library
CREATE INDEX IF NOT EXISTS idx_components_name_trgm
  ON component_library USING gin(name gin_trgm_ops);

-- 4. Add trigram indexes on car_makes and car_models
CREATE INDEX IF NOT EXISTS idx_car_makes_name_trgm
  ON car_makes USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_car_models_name_trgm
  ON car_models USING gin(name gin_trgm_ops);

-- 5. Add trigram index on categories
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING gin(name gin_trgm_ops);

-- =====================================================
-- FUNCTION: chatbot_search_car_makes
-- Fuzzy search for car brands (handles typos)
-- e.g., "toyata" -> "Toyota", "protn" -> "Proton"
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_search_car_makes(p_query TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.name,
    cm.logo_url,
    similarity(cm.name, p_query) AS similarity_score
  FROM car_makes cm
  WHERE
    cm.name ILIKE '%' || p_query || '%'
    OR similarity(cm.name, p_query) > 0.2
  ORDER BY
    -- Exact match first, then by similarity
    CASE WHEN cm.name ILIKE p_query THEN 0
         WHEN cm.name ILIKE p_query || '%' THEN 1
         WHEN cm.name ILIKE '%' || p_query || '%' THEN 2
         ELSE 3 END,
    similarity(cm.name, p_query) DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_search_car_models
-- Fuzzy search for car models within a brand
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_search_car_models(
  p_make_name TEXT,
  p_model_query TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  year_start INTEGER,
  year_end INTEGER,
  body_type TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cmod.id,
    cmod.name,
    cmod.year_start,
    cmod.year_end,
    cmod.body_type,
    CASE
      WHEN p_model_query IS NOT NULL THEN similarity(cmod.name, p_model_query)
      ELSE 1.0::REAL
    END AS similarity_score
  FROM car_models cmod
  JOIN car_makes cmak ON cmak.id = cmod.make_id
  WHERE
    cmak.name ILIKE p_make_name
    AND (
      p_model_query IS NULL
      OR cmod.name ILIKE '%' || p_model_query || '%'
      OR similarity(cmod.name, p_model_query) > 0.2
    )
  ORDER BY
    CASE
      WHEN p_model_query IS NOT NULL AND cmod.name ILIKE p_model_query THEN 0
      WHEN p_model_query IS NOT NULL AND cmod.name ILIKE p_model_query || '%' THEN 1
      ELSE 2
    END,
    cmod.sort_order ASC,
    cmod.name ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_search_categories
-- Fuzzy search for product categories
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_search_categories(p_query TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    similarity(c.name, p_query) AS similarity_score
  FROM categories c
  WHERE
    c.active = true
    AND (
      c.name ILIKE '%' || p_query || '%'
      OR c.slug ILIKE '%' || p_query || '%'
      OR similarity(c.name, p_query) > 0.2
    )
  ORDER BY similarity(c.name, p_query) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_search_products
-- Main product search - flexible fuzzy search
-- Searches by: name, brand, model, category, keywords
-- Supports filters for car compatibility
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_search_products(
  p_query TEXT DEFAULT NULL,
  p_car_brand TEXT DEFAULT NULL,
  p_car_model TEXT DEFAULT NULL,
  p_category_name TEXT DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_description TEXT,
  brand TEXT,
  model TEXT,
  category_name TEXT,
  normal_price NUMERIC,
  merchant_price NUMERIC,
  year_from INTEGER,
  year_to INTEGER,
  image_url TEXT,
  stock_available BOOLEAN,
  relevance_score REAL
) AS $$
BEGIN
  -- Normalize empty strings to NULL (AI agent may pass "" instead of null)
  p_query := NULLIF(TRIM(COALESCE(p_query, '')), '');
  p_car_brand := NULLIF(TRIM(COALESCE(p_car_brand, '')), '');
  p_car_model := NULLIF(TRIM(COALESCE(p_car_model, '')), '');
  p_category_name := NULLIF(TRIM(COALESCE(p_category_name, '')), '');

  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    LEFT(p.description, 200) AS product_description,
    p.brand,
    p.model,
    cat.name AS category_name,
    p.normal_price,
    p.merchant_price,
    p.year_from,
    p.year_to,
    (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image_url,
    COALESCE(p.stock_on_hand, 0) > 0 AS stock_available,
    -- Calculate relevance score
    GREATEST(
      CASE WHEN p_query IS NOT NULL THEN similarity(p.name, p_query) ELSE 0 END,
      CASE WHEN p_query IS NOT NULL AND p.brand IS NOT NULL THEN similarity(p.brand, p_query) ELSE 0 END,
      CASE WHEN p_query IS NOT NULL AND p.model IS NOT NULL THEN similarity(p.model, p_query) ELSE 0 END,
      CASE WHEN p_query IS NOT NULL AND p.description IS NOT NULL THEN similarity(p.description, p_query) * 0.5 ELSE 0 END
    )::REAL AS relevance_score
  FROM products_new p
  LEFT JOIN categories cat ON cat.id = p.category_id
  WHERE
    p.active = true
    -- Text search (fuzzy)
    AND (
      p_query IS NULL
      OR p.name ILIKE '%' || p_query || '%'
      OR p.brand ILIKE '%' || p_query || '%'
      OR p.model ILIKE '%' || p_query || '%'
      OR p.description ILIKE '%' || p_query || '%'
      OR similarity(p.name, p_query) > 0.15
      OR (p.brand IS NOT NULL AND similarity(p.brand, p_query) > 0.3)
    )
    -- Car brand filter
    AND (
      p_car_brand IS NULL
      OR p.brand ILIKE '%' || p_car_brand || '%'
      OR similarity(COALESCE(p.brand, ''), p_car_brand) > 0.3
    )
    -- Car model filter
    AND (
      p_car_model IS NULL
      OR p.model ILIKE '%' || p_car_model || '%'
      OR similarity(COALESCE(p.model, ''), p_car_model) > 0.3
    )
    -- Category filter
    AND (
      p_category_name IS NULL
      OR cat.name ILIKE '%' || p_category_name || '%'
      OR similarity(COALESCE(cat.name, ''), p_category_name) > 0.3
    )
    -- Price filter
    AND (
      p_max_price IS NULL
      OR p.normal_price <= p_max_price
    )
  ORDER BY
    -- Exact matches first
    CASE
      WHEN p_query IS NOT NULL AND p.name ILIKE p_query THEN 0
      WHEN p_query IS NOT NULL AND p.name ILIKE p_query || '%' THEN 1
      WHEN p_query IS NOT NULL AND p.name ILIKE '%' || p_query || '%' THEN 2
      ELSE 3
    END,
    relevance_score DESC,
    p.normal_price ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_get_product_components
-- Get purchasable components for a product
-- (This is what gets added to cart)
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_get_product_components(p_product_id UUID)
RETURNS TABLE(
  component_id UUID,
  component_sku TEXT,
  component_name TEXT,
  component_type TEXT,
  normal_price NUMERIC,
  merchant_price NUMERIC,
  stock_level INTEGER,
  image_url TEXT,
  in_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id AS component_id,
    cl.component_sku,
    cl.name AS component_name,
    cl.component_type,
    cl.normal_price,
    cl.merchant_price,
    cl.stock_level,
    cl.default_image_url AS image_url,
    COALESCE(cl.stock_level, 0) > 0 AS in_stock
  FROM product_components pc
  JOIN component_library cl ON cl.id = pc.component_id
  WHERE pc.product_id = p_product_id
    AND cl.is_active = true
  ORDER BY pc.display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_get_customer_orders
-- Get recent orders for a customer by phone number
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_get_customer_orders(p_phone TEXT)
RETURNS TABLE(
  order_id UUID,
  order_no TEXT,
  status TEXT,
  payment_state TEXT,
  total NUMERIC,
  item_count BIGINT,
  courier_provider TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ,
  delivery_method TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by phone (try multiple formats)
  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  -- Also try profiles table
  IF v_user_id IS NULL THEN
    SELECT pr.id INTO v_user_id
    FROM profiles pr
    WHERE pr.phone_e164 = p_phone
       OR pr.phone_e164 = '+' || p_phone
       OR pr.phone_e164 = '+6' || p_phone
       OR pr.phone_e164 = '6' || p_phone
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN; -- No results if user not found
  END IF;

  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.order_no,
    o.status,
    o.payment_state,
    o.total,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
    o.courier_provider,
    o.courier_tracking_number AS tracking_number,
    o.created_at,
    o.delivery_method
  FROM orders o
  WHERE o.user_id = v_user_id
  ORDER BY o.created_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_get_order_details
-- Get full order details by order number
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_get_order_details(p_order_no TEXT)
RETURNS TABLE(
  order_id UUID,
  order_no TEXT,
  status TEXT,
  payment_state TEXT,
  total NUMERIC,
  subtotal NUMERIC,
  delivery_fee NUMERIC,
  courier_provider TEXT,
  tracking_number TEXT,
  delivery_method TEXT,
  created_at TIMESTAMPTZ,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.order_no,
    o.status,
    o.payment_state,
    o.total,
    o.subtotal,
    o.delivery_fee,
    o.courier_provider,
    o.courier_tracking_number AS tracking_number,
    o.delivery_method,
    o.created_at,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'name', oi.component_name,
        'sku', oi.component_sku,
        'qty', oi.quantity,
        'price', oi.unit_price,
        'total', oi.total_price
      ))
      FROM order_items oi WHERE oi.order_id = o.id
    ) AS items
  FROM orders o
  WHERE o.order_no ILIKE p_order_no
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_add_to_cart
-- Add item to cart via chatbot (by phone number)
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_add_to_cart(
  p_phone TEXT,
  p_component_sku TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  cart_item_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
  v_component RECORD;
  v_product_name TEXT;
BEGIN
  -- Find user by phone
  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pr.id INTO v_user_id
    FROM profiles pr
    WHERE pr.phone_e164 = p_phone
       OR pr.phone_e164 = '+' || p_phone
       OR pr.phone_e164 = '+6' || p_phone
       OR pr.phone_e164 = '6' || p_phone
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found. Please register an account first.'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Get component details
  SELECT cl.* INTO v_component
  FROM component_library cl
  WHERE cl.component_sku = p_component_sku
    AND cl.is_active = true;

  IF v_component IS NULL THEN
    RETURN QUERY SELECT false, 'Product not found or unavailable.'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Check stock
  IF COALESCE(v_component.stock_level, 0) < p_quantity THEN
    RETURN QUERY SELECT false, ('Only ' || COALESCE(v_component.stock_level, 0) || ' units in stock.')::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Get or create active cart
  SELECT c.id INTO v_cart_id
  FROM carts c
  WHERE c.user_id = v_user_id
    AND c.status = 'ACTIVE'
  LIMIT 1;

  IF v_cart_id IS NULL THEN
    INSERT INTO carts (user_id, status)
    VALUES (v_user_id, 'ACTIVE')
    RETURNING id INTO v_cart_id;
  END IF;

  -- Get product name for context
  SELECT pn.name INTO v_product_name
  FROM product_components pc
  JOIN products_new pn ON pn.id = pc.product_id
  WHERE pc.component_id = v_component.id
  LIMIT 1;

  -- Upsert cart item
  INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
  VALUES (v_cart_id, v_component.id, p_quantity, v_component.normal_price)
  ON CONFLICT (cart_id, product_id)
  DO UPDATE SET
    quantity = cart_items.quantity + p_quantity,
    updated_at = NOW();

  RETURN QUERY
  SELECT
    true,
    ('Added ' || p_quantity || 'x ' || v_component.name || ' (RM' || v_component.normal_price || ') to your cart.')::TEXT,
    (SELECT COUNT(*) FROM cart_items ci WHERE ci.cart_id = v_cart_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_get_cart
-- View current cart by phone number
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_get_cart(p_phone TEXT)
RETURNS TABLE(
  component_name TEXT,
  component_sku TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  line_total NUMERIC,
  cart_total NUMERIC
) AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
BEGIN
  -- Find user
  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pr.id INTO v_user_id
    FROM profiles pr
    WHERE pr.phone_e164 = p_phone
       OR pr.phone_e164 = '+' || p_phone
       OR pr.phone_e164 = '+6' || p_phone
       OR pr.phone_e164 = '6' || p_phone
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT c.id INTO v_cart_id
  FROM carts c
  WHERE c.user_id = v_user_id AND c.status = 'ACTIVE'
  LIMIT 1;

  IF v_cart_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    cl.name AS component_name,
    cl.component_sku,
    ci.quantity,
    ci.unit_price,
    (ci.quantity * ci.unit_price) AS line_total,
    (SELECT SUM(ci2.quantity * ci2.unit_price) FROM cart_items ci2 WHERE ci2.cart_id = v_cart_id) AS cart_total
  FROM cart_items ci
  JOIN component_library cl ON cl.id = ci.product_id
  WHERE ci.cart_id = v_cart_id
  ORDER BY ci.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_remove_from_cart
-- Remove item or reduce quantity in cart via chatbot
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_remove_from_cart(
  p_phone TEXT,
  p_component_sku TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  cart_item_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
  v_component RECORD;
  v_cart_item RECORD;
BEGIN
  -- Find user by phone
  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pr.id INTO v_user_id
    FROM profiles pr
    WHERE pr.phone_e164 = p_phone
       OR pr.phone_e164 = '+' || p_phone
       OR pr.phone_e164 = '+6' || p_phone
       OR pr.phone_e164 = '6' || p_phone
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found.'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Get active cart
  SELECT c.id INTO v_cart_id
  FROM carts c
  WHERE c.user_id = v_user_id AND c.status = 'ACTIVE'
  LIMIT 1;

  IF v_cart_id IS NULL THEN
    RETURN QUERY SELECT false, 'Your cart is empty.'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Find the component
  SELECT cl.id, cl.name INTO v_component
  FROM component_library cl
  WHERE cl.component_sku = p_component_sku;

  IF v_component IS NULL THEN
    RETURN QUERY SELECT false, 'Item not found.'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  -- Find item in cart
  SELECT ci.* INTO v_cart_item
  FROM cart_items ci
  WHERE ci.cart_id = v_cart_id AND ci.product_id = v_component.id;

  IF v_cart_item IS NULL THEN
    RETURN QUERY SELECT false, ('Item ' || v_component.name || ' is not in your cart.')::TEXT,
      (SELECT COUNT(*) FROM cart_items ci2 WHERE ci2.cart_id = v_cart_id);
    RETURN;
  END IF;

  -- Remove or reduce quantity
  IF p_quantity >= v_cart_item.quantity THEN
    -- Remove entirely
    DELETE FROM cart_items WHERE id = v_cart_item.id;
    RETURN QUERY SELECT true,
      ('Removed ' || v_component.name || ' from your cart.')::TEXT,
      (SELECT COUNT(*) FROM cart_items ci2 WHERE ci2.cart_id = v_cart_id);
  ELSE
    -- Reduce quantity
    UPDATE cart_items
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE id = v_cart_item.id;
    RETURN QUERY SELECT true,
      ('Reduced ' || v_component.name || ' by ' || p_quantity || '. Now ' || (v_cart_item.quantity - p_quantity) || ' in cart.')::TEXT,
      (SELECT COUNT(*) FROM cart_items ci2 WHERE ci2.cart_id = v_cart_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_clear_cart
-- Clear all items from cart via chatbot
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_clear_cart(p_phone TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_cart_id UUID;
  v_item_count INTEGER;
BEGIN
  -- Find user by phone
  SELECT cp.user_id INTO v_user_id
  FROM customer_profiles cp
  WHERE cp.phone_e164 = p_phone
     OR cp.phone_e164 = '+' || p_phone
     OR cp.phone_e164 = '+6' || p_phone
     OR cp.phone_e164 = '6' || p_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT pr.id INTO v_user_id
    FROM profiles pr
    WHERE pr.phone_e164 = p_phone
       OR pr.phone_e164 = '+' || p_phone
       OR pr.phone_e164 = '+6' || p_phone
       OR pr.phone_e164 = '6' || p_phone
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found.'::TEXT;
    RETURN;
  END IF;

  -- Get active cart
  SELECT c.id INTO v_cart_id
  FROM carts c
  WHERE c.user_id = v_user_id AND c.status = 'ACTIVE'
  LIMIT 1;

  IF v_cart_id IS NULL THEN
    RETURN QUERY SELECT false, 'Your cart is already empty.'::TEXT;
    RETURN;
  END IF;

  -- Count items before clearing
  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM cart_items WHERE cart_id = v_cart_id;

  IF v_item_count = 0 THEN
    RETURN QUERY SELECT false, 'Your cart is already empty.'::TEXT;
    RETURN;
  END IF;

  -- Delete all cart items
  DELETE FROM cart_items WHERE cart_id = v_cart_id;

  RETURN QUERY SELECT true, ('Cart cleared! Removed ' || v_item_count || ' item(s).')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_list_popular_categories
-- Get active categories for quick menu display
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_list_popular_categories()
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  product_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) AS product_count
  FROM categories c
  LEFT JOIN products_new p ON p.category_id = c.id AND p.active = true
  WHERE c.active = true
  GROUP BY c.id, c.name, c.slug
  HAVING COUNT(p.id) > 0
  ORDER BY COUNT(p.id) DESC
  LIMIT 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: chatbot_list_car_makes
-- Get popular car makes for quick selection
-- =====================================================
CREATE OR REPLACE FUNCTION chatbot_list_car_makes()
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  is_popular BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.id, cm.name, cm.logo_url, cm.is_popular
  FROM car_makes cm
  ORDER BY cm.is_popular DESC, cm.sort_order ASC, cm.name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant execute permissions (for Supabase service role)
-- =====================================================
GRANT EXECUTE ON FUNCTION chatbot_search_car_makes TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_search_car_models TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_search_categories TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_search_products TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_get_product_components TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_get_customer_orders TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_get_order_details TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_add_to_cart TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_get_cart TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_remove_from_cart TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_clear_cart TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_list_popular_categories TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_list_car_makes TO service_role;

-- Also grant to anon for webhook calls
GRANT EXECUTE ON FUNCTION chatbot_search_car_makes TO anon;
GRANT EXECUTE ON FUNCTION chatbot_search_car_models TO anon;
GRANT EXECUTE ON FUNCTION chatbot_search_categories TO anon;
GRANT EXECUTE ON FUNCTION chatbot_search_products TO anon;
GRANT EXECUTE ON FUNCTION chatbot_get_product_components TO anon;
GRANT EXECUTE ON FUNCTION chatbot_get_customer_orders TO anon;
GRANT EXECUTE ON FUNCTION chatbot_get_order_details TO anon;
GRANT EXECUTE ON FUNCTION chatbot_add_to_cart TO anon;
GRANT EXECUTE ON FUNCTION chatbot_get_cart TO anon;
GRANT EXECUTE ON FUNCTION chatbot_remove_from_cart TO anon;
GRANT EXECUTE ON FUNCTION chatbot_clear_cart TO anon;
GRANT EXECUTE ON FUNCTION chatbot_list_popular_categories TO anon;
GRANT EXECUTE ON FUNCTION chatbot_list_car_makes TO anon;
