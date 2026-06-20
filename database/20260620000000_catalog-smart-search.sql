-- =====================================================
-- CATALOG SMART SEARCH
-- Customer-facing catalog search + filtering RPC.
-- Adapted from chatbot_smart_search: tokenized, fuzzy
-- (pg_trgm), component-aware, year-aware, with category/
-- brand filters, sorting, and server-side pagination.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes that back the fuzzy similarity() / ILIKE matching.
CREATE INDEX IF NOT EXISTS idx_products_new_name_trgm
  ON products_new USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_new_model_trgm
  ON products_new USING gin (lower(coalesce(model, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_component_library_name_trgm
  ON component_library USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_new_keywords_gin
  ON products_new USING gin (keywords);

DROP FUNCTION IF EXISTS catalog_search_products(TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION catalog_search_products(
  p_query    TEXT    DEFAULT '',
  p_category UUID    DEFAULT NULL,
  p_brand    TEXT    DEFAULT NULL,
  p_sort     TEXT    DEFAULT 'relevance',  -- relevance | newest | featured
  p_limit    INTEGER DEFAULT 24,
  p_offset   INTEGER DEFAULT 0
)
RETURNS TABLE(
  id            UUID,
  name          TEXT,
  slug          TEXT,
  brand         TEXT,
  model         TEXT,
  year_from     INTEGER,
  year_to       INTEGER,
  featured      BOOLEAN,
  category_id   UUID,
  category_name TEXT,
  vendor_name   TEXT,
  image_url     TEXT,
  image_type    TEXT,
  component_count INTEGER,
  match_score   REAL,
  total_count   BIGINT
) AS $$
DECLARE
  v_query  TEXT;
  v_tokens TEXT[];
BEGIN
  v_query := LOWER(TRIM(COALESCE(p_query, '')));

  -- Tokenize on whitespace, drop empty tokens.
  SELECT COALESCE(array_agg(tok), ARRAY[]::TEXT[])
  INTO v_tokens
  FROM unnest(regexp_split_to_array(v_query, '\s+')) AS t(tok)
  WHERE length(tok) > 0;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id, p.name, p.slug, p.brand, p.model, p.year_from, p.year_to,
      p.featured, p.category_id, p.created_at,
      cat.name AS category_name,
      ven.business_name AS vendor_name,
      img.url AS image_url,
      COALESCE(img.media_type, 'image') AS image_type,
      (
        SELECT COUNT(*)::INTEGER
        FROM product_components pc
        JOIN component_library cl ON cl.id = pc.component_id AND cl.is_active = true
        WHERE pc.product_id = p.id
      ) AS component_count,
      -- Relevance score (0 when browsing with an empty query).
      CASE WHEN v_query = '' THEN 0::REAL ELSE (
          -- Exact substring on name
          CASE WHEN LOWER(p.name) ILIKE '%' || v_query || '%' THEN 10.0 ELSE 0 END
          -- All tokens present in name
          + CASE WHEN array_length(v_tokens, 1) > 0 AND (
              SELECT COUNT(*) FROM unnest(v_tokens) t(tok)
              WHERE LOWER(p.name) ILIKE '%' || tok || '%'
            ) = array_length(v_tokens, 1) THEN 8.0 ELSE 0 END
          -- Trigram similarity on full name
          + similarity(LOWER(p.name), v_query) * 5.0
          -- Per-token credit in name
          + COALESCE((
              SELECT SUM(CASE
                WHEN LOWER(p.name) ILIKE '%' || tok || '%' THEN 2.0
                WHEN similarity(LOWER(p.name), tok) > 0.3 THEN 1.0
                ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          -- Model
          + CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || v_query || '%' THEN 3.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || tok || '%' THEN 2.0 ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          -- Brand
          + CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || tok || '%' THEN 1.5 ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          -- Description
          + CASE WHEN p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%' THEN 1.5 ELSE 0 END
          -- Keywords
          + CASE WHEN p.keywords IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(p.keywords) kw
              WHERE LOWER(kw) ILIKE '%' || v_query || '%' OR similarity(LOWER(kw), v_query) > 0.4
            ) THEN 3.0 ELSE 0 END
          -- Category
          + CASE WHEN cat.name IS NOT NULL AND LOWER(cat.name) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
          -- Component names
          + CASE WHEN EXISTS (
              SELECT 1 FROM product_components pc3
              JOIN component_library cl3 ON cl3.id = pc3.component_id AND cl3.is_active = true
              WHERE pc3.product_id = p.id
              AND (LOWER(cl3.name) ILIKE '%' || v_query || '%' OR similarity(LOWER(cl3.name), v_query) > 0.3)
            ) THEN 3.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN EXISTS (
                SELECT 1 FROM product_components pc4
                JOIN component_library cl4 ON cl4.id = pc4.component_id AND cl4.is_active = true
                WHERE pc4.product_id = p.id AND LOWER(cl4.name) ILIKE '%' || tok || '%'
              ) THEN 1.5 ELSE 0 END)
              FROM unnest(v_tokens) t(tok) WHERE length(tok) >= 2), 0)
          -- Year tokens (08 -> 2008, or full 4-digit year) within year_from..year_to
          + COALESCE((
              SELECT SUM(3.0) FROM unnest(v_tokens) t(tok)
              WHERE p.year_from IS NOT NULL AND p.year_to IS NOT NULL
              AND (
                (tok ~ '^[0-9]{4}$' AND tok::INT BETWEEN p.year_from AND p.year_to)
                OR (tok ~ '^[0-9]{2}$' AND (2000 + tok::INT) BETWEEN p.year_from AND p.year_to)
              )
            ), 0)
        )::REAL
      END AS score
    FROM products_new p
    LEFT JOIN categories cat ON cat.id = p.category_id
    LEFT JOIN vendors ven ON ven.id = p.vendor_id
    LEFT JOIN LATERAL (
      SELECT pi.url, pi.media_type
      FROM product_images_new pi
      WHERE pi.product_id = p.id
      ORDER BY (pi.media_type = 'video'), pi.is_primary DESC NULLS LAST, pi.sort_order ASC NULLS LAST
      LIMIT 1
    ) img ON true
    WHERE p.active = true
      AND p.approval_status = 'APPROVED'
      AND (p_category IS NULL OR p.category_id = p_category)
      AND (p_brand IS NULL OR p.brand = p_brand)
  ),
  filtered AS (
    SELECT * FROM base
    WHERE v_query = '' OR score > 0
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM filtered
  )
  SELECT
    c.id, c.name, c.slug, c.brand, c.model, c.year_from, c.year_to,
    c.featured, c.category_id, c.category_name, c.vendor_name,
    c.image_url, c.image_type, c.component_count, c.score, c.total_count
  FROM counted c
  ORDER BY
    (CASE WHEN p_sort = 'relevance' THEN c.score ELSE 0 END) DESC,
    (CASE WHEN p_sort = 'featured'  THEN (CASE WHEN c.featured THEN 1 ELSE 0 END) ELSE 0 END) DESC,
    c.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION catalog_search_products(TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;
