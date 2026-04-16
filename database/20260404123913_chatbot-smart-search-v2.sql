-- =====================================================
-- CHATBOT SMART SEARCH V2
-- Strong product search that handles all query patterns
-- Searches product name, components, keywords, and more
-- =====================================================

-- Drop old function to replace with V2
DROP FUNCTION IF EXISTS chatbot_smart_search(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION chatbot_smart_search(
  p_query TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_description TEXT,
  category_name TEXT,
  normal_price NUMERIC,
  merchant_price NUMERIC,
  year_from INTEGER,
  year_to INTEGER,
  image_url TEXT,
  stock_available BOOLEAN,
  match_score REAL,
  components JSONB
) AS $$
DECLARE
  v_query TEXT;
  v_tokens TEXT[];
  v_token TEXT;
BEGIN
  -- Normalize: trim, lowercase
  v_query := LOWER(TRIM(COALESCE(p_query, '')));

  -- If empty query, return popular/recent products
  IF v_query = '' THEN
    RETURN QUERY
    SELECT
      p.id,
      p.name,
      p.slug,
      LEFT(p.description, 200),
      cat.name,
      p.normal_price,
      p.merchant_price,
      p.year_from,
      p.year_to,
      (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1),
      COALESCE(p.stock_on_hand, 0) > 0,
      1.0::REAL,
      (
        SELECT jsonb_agg(jsonb_build_object(
          'sku', cl.component_sku,
          'name', cl.name,
          'normal_price', cl.normal_price,
          'merchant_price', cl.merchant_price,
          'stock', cl.stock_level
        ) ORDER BY pc2.display_order)
        FROM product_components pc2
        JOIN component_library cl ON cl.id = pc2.component_id AND cl.is_active = true
        WHERE pc2.product_id = p.id
      )
    FROM products_new p
    LEFT JOIN categories cat ON cat.id = p.category_id
    WHERE p.active = true
    ORDER BY p.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Tokenize query for multi-word matching
  v_tokens := string_to_array(v_query, ' ');

  RETURN QUERY
  WITH scored_products AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      LEFT(p.description, 200) AS description,
      cat.name AS cat_name,
      p.normal_price,
      p.merchant_price,
      p.year_from,
      p.year_to,
      COALESCE(p.stock_on_hand, 0) > 0 AS in_stock,
      -- Multi-signal scoring
      (
        -- 1. Exact substring match on product name (highest weight)
        CASE WHEN LOWER(p.name) ILIKE '%' || v_query || '%' THEN 10.0 ELSE 0 END
        -- 2. All tokens present in product name
        + CASE WHEN (
            SELECT COUNT(*) FROM unnest(v_tokens) t(tok)
            WHERE LOWER(p.name) ILIKE '%' || tok || '%'
          ) = array_length(v_tokens, 1) THEN 8.0 ELSE 0 END
        -- 3. Trigram similarity on full name
        + similarity(LOWER(p.name), v_query) * 5.0
        -- 4. Token matches in name (partial credit per token)
        + (
            SELECT COALESCE(SUM(
              CASE WHEN LOWER(p.name) ILIKE '%' || tok || '%' THEN 2.0
                   WHEN similarity(LOWER(p.name), tok) > 0.3 THEN 1.0
                   ELSE 0 END
            ), 0)
            FROM unnest(v_tokens) t(tok)
          )
        -- 5. Model column match
        + CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || v_query || '%' THEN 3.0
               WHEN p.model IS NOT NULL AND similarity(LOWER(COALESCE(p.model, '')), v_query) > 0.3 THEN 1.5
               ELSE 0 END
        -- 6. Token matches in model
        + (
            SELECT COALESCE(SUM(
              CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || tok || '%' THEN 2.0 ELSE 0 END
            ), 0)
            FROM unnest(v_tokens) t(tok)
          )
        -- 7. Brand column match
        + CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
        -- 8. Description match
        + CASE WHEN p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%' THEN 1.5 ELSE 0 END
        -- 9. Keywords array match
        + CASE WHEN p.keywords IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(p.keywords) kw
            WHERE LOWER(kw) ILIKE '%' || v_query || '%'
            OR similarity(LOWER(kw), v_query) > 0.4
          ) THEN 3.0 ELSE 0 END
        -- 10. Token matches in keywords
        + (
            SELECT COALESCE(SUM(
              CASE WHEN p.keywords IS NOT NULL AND EXISTS (
                SELECT 1 FROM unnest(p.keywords) kw WHERE LOWER(kw) ILIKE '%' || tok || '%'
              ) THEN 1.5 ELSE 0 END
            ), 0)
            FROM unnest(v_tokens) t(tok)
          )
        -- 11. Category name match
        + CASE WHEN cat.name IS NOT NULL AND LOWER(cat.name) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
        -- 12. Component name match (find products that have matching components)
        + CASE WHEN EXISTS (
            SELECT 1 FROM product_components pc3
            JOIN component_library cl3 ON cl3.id = pc3.component_id
            WHERE pc3.product_id = p.id
            AND (LOWER(cl3.name) ILIKE '%' || v_query || '%'
                 OR similarity(LOWER(cl3.name), v_query) > 0.3)
          ) THEN 3.0 ELSE 0 END
      )::REAL AS score
    FROM products_new p
    LEFT JOIN categories cat ON cat.id = p.category_id
    WHERE p.active = true
    AND (
      -- At least one signal must match to include the product
      LOWER(p.name) ILIKE '%' || v_query || '%'
      OR similarity(LOWER(p.name), v_query) > 0.15
      -- Token-based: any token matches name
      OR EXISTS (
        SELECT 1 FROM unnest(v_tokens) t(tok)
        WHERE LOWER(p.name) ILIKE '%' || tok || '%'
        AND length(tok) >= 2
      )
      -- Model match
      OR (p.model IS NOT NULL AND (
        LOWER(p.model) ILIKE '%' || v_query || '%'
        OR similarity(LOWER(COALESCE(p.model, '')), v_query) > 0.3
        OR EXISTS (
          SELECT 1 FROM unnest(v_tokens) t(tok)
          WHERE LOWER(p.model) ILIKE '%' || tok || '%' AND length(tok) >= 2
        )
      ))
      -- Brand match
      OR (p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%')
      -- Keywords match
      OR (p.keywords IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(p.keywords) kw
        WHERE LOWER(kw) ILIKE '%' || v_query || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(v_tokens) t(tok)
          WHERE LOWER(kw) ILIKE '%' || tok || '%' AND length(tok) >= 2
        )
      ))
      -- Description match
      OR (p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%')
      -- Component name match
      OR EXISTS (
        SELECT 1 FROM product_components pc3
        JOIN component_library cl3 ON cl3.id = pc3.component_id
        WHERE pc3.product_id = p.id
        AND (LOWER(cl3.name) ILIKE '%' || v_query || '%'
             OR EXISTS (
               SELECT 1 FROM unnest(v_tokens) t(tok)
               WHERE LOWER(cl3.name) ILIKE '%' || tok || '%' AND length(tok) >= 2
             ))
      )
    )
  )
  SELECT
    sp.id,
    sp.name,
    sp.slug,
    sp.description,
    sp.cat_name,
    sp.normal_price,
    sp.merchant_price,
    sp.year_from,
    sp.year_to,
    (SELECT pi.url FROM product_images_new pi WHERE pi.product_id = sp.id AND pi.is_primary = true LIMIT 1),
    sp.in_stock,
    sp.score,
    -- Include components inline so chatbot doesn't need a second call
    (
      SELECT jsonb_agg(jsonb_build_object(
        'sku', cl.component_sku,
        'name', cl.name,
        'normal_price', cl.normal_price,
        'merchant_price', cl.merchant_price,
        'stock', cl.stock_level
      ) ORDER BY pc2.display_order)
      FROM product_components pc2
      JOIN component_library cl ON cl.id = pc2.component_id AND cl.is_active = true
      WHERE pc2.product_id = sp.id
    )
  FROM scored_products sp
  WHERE sp.score > 0
  ORDER BY sp.score DESC, sp.normal_price ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION chatbot_smart_search TO service_role;
GRANT EXECUTE ON FUNCTION chatbot_smart_search TO anon;

-- Add index on keywords if not exists
CREATE INDEX IF NOT EXISTS idx_products_keywords_gin
  ON products_new USING gin(keywords);
