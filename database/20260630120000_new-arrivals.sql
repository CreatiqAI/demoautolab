-- ============================================================================
-- New Arrivals
-- ----------------------------------------------------------------------------
-- A product becomes a "new arrival" when an admin stamps `new_arrival_at` (the
-- start). It stays on the New Arrivals page for 30 days from that moment, then
-- silently falls out of the window — auto-removal is purely query-time, no cron.
--
--   1. products_new.new_arrival_at  (nullable timestamptz; NULL = not new)
--   2. partial index for the window query
--   3. get_new_arrivals(p_limit, p_offset)  — card-shape feed for the page
--   4. catalog_search_products  — same as before + an is_new_arrival flag so a
--      "New" badge can render anywhere a product card appears
-- ============================================================================

-- 1. Column ------------------------------------------------------------------
ALTER TABLE public.products_new
  ADD COLUMN IF NOT EXISTS new_arrival_at timestamptz NULL;

COMMENT ON COLUMN public.products_new.new_arrival_at IS
  'When the product was placed into New Arrivals (the 30-day window start). NULL = not a new arrival.';

-- 2. Index (only the marked rows) --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_new_new_arrival_at
  ON public.products_new (new_arrival_at DESC)
  WHERE new_arrival_at IS NOT NULL;

-- 3. New Arrivals feed --------------------------------------------------------
-- Mirrors the card shape (and image-selection logic) of catalog_search_products
-- so the existing CatalogProductCard can be reused unchanged.
CREATE OR REPLACE FUNCTION public.get_new_arrivals(
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, name text, slug text, brand text, model text,
  year_from integer, year_to integer, featured boolean,
  category_id uuid, category_name text, vendor_name text,
  image_url text, image_type text, component_count integer,
  is_new_arrival boolean, new_arrival_at timestamptz, total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  WITH base AS (
    SELECT
      p.id, p.name, p.slug, p.brand, p.model, p.year_from, p.year_to,
      p.featured, p.category_id, p.new_arrival_at,
      cat.name AS category_name,
      ven.business_name AS vendor_name,
      img.url AS image_url,
      COALESCE(img.media_type, 'image') AS image_type,
      (
        SELECT COUNT(*)::INTEGER
        FROM product_components pc
        JOIN component_library cl ON cl.id = pc.component_id AND cl.is_active = true
        WHERE pc.product_id = p.id
      ) AS component_count
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
      AND p.deleted_at IS NULL
      AND p.new_arrival_at IS NOT NULL
      AND p.new_arrival_at <= now()
      AND p.new_arrival_at > now() - interval '30 days'
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM base
  )
  SELECT
    c.id, c.name, c.slug, c.brand, c.model, c.year_from, c.year_to,
    c.featured, c.category_id, c.category_name, c.vendor_name,
    c.image_url, c.image_type, c.component_count,
    true AS is_new_arrival, c.new_arrival_at, c.total_count
  FROM counted c
  ORDER BY c.new_arrival_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$function$;

GRANT EXECUTE ON FUNCTION public.get_new_arrivals(integer, integer) TO anon, authenticated;

-- 4. Catalog search — add an is_new_arrival flag -----------------------------
-- Adding an OUT column changes the return type, so the function must be dropped
-- and recreated. The body is identical to the previous version except for the
-- new computed `is_new_arrival` column (carried through to the final SELECT).
DROP FUNCTION IF EXISTS public.catalog_search_products(text, uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.catalog_search_products(
  p_query text DEFAULT ''::text,
  p_category uuid DEFAULT NULL::uuid,
  p_brand text DEFAULT NULL::text,
  p_sort text DEFAULT 'relevance'::text,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, name text, slug text, brand text, model text,
  year_from integer, year_to integer, featured boolean,
  category_id uuid, category_name text, vendor_name text,
  image_url text, image_type text, component_count integer,
  match_score real, is_full_match boolean, total_count bigint, full_count bigint,
  is_new_arrival boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_query  TEXT;
  v_tokens TEXT[];
  v_ntok   INTEGER;
BEGIN
  v_query := LOWER(TRIM(COALESCE(p_query, '')));

  SELECT COALESCE(array_agg(tok), ARRAY[]::TEXT[])
  INTO v_tokens
  FROM unnest(regexp_split_to_array(v_query, '\s+')) AS t(tok)
  WHERE length(tok) > 0;

  v_ntok := COALESCE(array_length(v_tokens, 1), 0);

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id, p.name, p.slug, p.brand, p.model, p.year_from, p.year_to,
      p.featured, p.category_id, p.created_at,
      (p.new_arrival_at IS NOT NULL
        AND p.new_arrival_at <= now()
        AND p.new_arrival_at > now() - interval '30 days') AS is_new_arrival,
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
      CASE WHEN v_query = '' THEN 0 ELSE (
        SELECT COUNT(*) FROM unnest(v_tokens) t(tok)
        WHERE
          LOWER(p.name) ILIKE '%' || tok || '%'
          OR (p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || tok || '%')
          OR (p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || tok || '%')
          OR (p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || tok || '%')
          OR (cat.name IS NOT NULL AND LOWER(cat.name) ILIKE '%' || tok || '%')
          OR (p.keywords IS NOT NULL AND EXISTS (
                SELECT 1 FROM unnest(p.keywords) kw WHERE LOWER(kw) ILIKE '%' || tok || '%'))
          OR EXISTS (
                SELECT 1 FROM product_components pcx
                JOIN component_library clx ON clx.id = pcx.component_id AND clx.is_active = true
                WHERE pcx.product_id = p.id
                  AND (LOWER(clx.name) ILIKE '%' || tok || '%'
                       OR (clx.component_sku IS NOT NULL AND LOWER(clx.component_sku) ILIKE '%' || tok || '%')))
          OR (tok ~ '^[0-9]{4}$' AND p.year_from IS NOT NULL AND p.year_to IS NOT NULL
                AND tok::INT BETWEEN p.year_from AND p.year_to)
          OR (tok ~ '^[0-9]{2}$' AND p.year_from IS NOT NULL AND p.year_to IS NOT NULL
                AND (2000 + tok::INT) BETWEEN p.year_from AND p.year_to)
      ) END AS matched_tokens,
      CASE WHEN v_query = '' THEN 0::REAL ELSE (
          CASE WHEN LOWER(p.name) ILIKE '%' || v_query || '%' THEN 10.0 ELSE 0 END
          + CASE WHEN v_ntok > 0 AND (
              SELECT COUNT(*) FROM unnest(v_tokens) t(tok)
              WHERE LOWER(p.name) ILIKE '%' || tok || '%'
            ) = v_ntok THEN 8.0 ELSE 0 END
          + similarity(LOWER(p.name), v_query) * 5.0
          + COALESCE((
              SELECT SUM(CASE
                WHEN LOWER(p.name) ILIKE '%' || tok || '%' THEN 2.0
                WHEN similarity(LOWER(p.name), tok) > 0.3 THEN 1.0
                ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          + CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || v_query || '%' THEN 3.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN p.model IS NOT NULL AND LOWER(p.model) ILIKE '%' || tok || '%' THEN 2.0 ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          + CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN p.brand IS NOT NULL AND LOWER(p.brand) ILIKE '%' || tok || '%' THEN 1.5 ELSE 0 END)
              FROM unnest(v_tokens) t(tok)), 0)
          + CASE WHEN p.description IS NOT NULL AND LOWER(p.description) ILIKE '%' || v_query || '%' THEN 1.5 ELSE 0 END
          + CASE WHEN p.keywords IS NOT NULL AND EXISTS (
              SELECT 1 FROM unnest(p.keywords) kw
              WHERE LOWER(kw) ILIKE '%' || v_query || '%' OR similarity(LOWER(kw), v_query) > 0.4
            ) THEN 3.0 ELSE 0 END
          + CASE WHEN cat.name IS NOT NULL AND LOWER(cat.name) ILIKE '%' || v_query || '%' THEN 2.0 ELSE 0 END
          + CASE WHEN EXISTS (
              SELECT 1 FROM product_components pc3
              JOIN component_library cl3 ON cl3.id = pc3.component_id AND cl3.is_active = true
              WHERE pc3.product_id = p.id
              AND (LOWER(cl3.name) ILIKE '%' || v_query || '%'
                   OR similarity(LOWER(cl3.name), v_query) > 0.3
                   OR (cl3.component_sku IS NOT NULL AND LOWER(cl3.component_sku) ILIKE '%' || v_query || '%'))
            ) THEN 3.0 ELSE 0 END
          + COALESCE((
              SELECT SUM(CASE WHEN EXISTS (
                SELECT 1 FROM product_components pc4
                JOIN component_library cl4 ON cl4.id = pc4.component_id AND cl4.is_active = true
                WHERE pc4.product_id = p.id
                  AND (LOWER(cl4.name) ILIKE '%' || tok || '%'
                       OR (cl4.component_sku IS NOT NULL AND LOWER(cl4.component_sku) ILIKE '%' || tok || '%'))
              ) THEN 1.5 ELSE 0 END)
              FROM unnest(v_tokens) t(tok) WHERE length(tok) >= 2), 0)
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
  flagged AS (
    SELECT *,
      (v_ntok = 0 OR matched_tokens >= v_ntok) AS fmatch
    FROM base
  ),
  filtered AS (
    SELECT * FROM flagged
    WHERE v_query = '' OR score > 0
  ),
  counted AS (
    SELECT *,
      COUNT(*) OVER() AS total_count,
      COUNT(*) FILTER (WHERE fmatch) OVER() AS full_count
    FROM filtered
  )
  SELECT
    c.id, c.name, c.slug, c.brand, c.model, c.year_from, c.year_to,
    c.featured, c.category_id, c.category_name, c.vendor_name,
    c.image_url, c.image_type, c.component_count, c.score, c.fmatch,
    c.total_count, c.full_count, c.is_new_arrival
  FROM counted c
  ORDER BY
    c.fmatch DESC,
    (CASE WHEN p_sort = 'relevance' THEN c.score ELSE 0 END) DESC,
    (CASE WHEN p_sort = 'featured'  THEN (CASE WHEN c.featured THEN 1 ELSE 0 END) ELSE 0 END) DESC,
    c.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.catalog_search_products(text, uuid, text, text, integer, integer) TO anon, authenticated;
