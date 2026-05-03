-- ============================================================================
-- FIX search_components RPC: type mismatch in relevance_score column
-- ============================================================================
-- The previous version of search_components() declared relevance_score as
-- NUMERIC in the RETURNS TABLE clause, but the CASE expression returned
-- INTEGER literals (100, 95, 90, ...). Postgres rejects this with:
--
--   ERROR: structure of query does not match function result type
--   DETAIL: Returned type integer does not match expected type numeric in column 10
--
-- Surface symptom: every component search from the admin product editor
-- returned HTTP 400 from /rest/v1/rpc/search_components.
--
-- Fix: cast the CASE result to NUMERIC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_components(search_term TEXT)
RETURNS TABLE (
  id UUID,
  component_sku TEXT,
  name TEXT,
  description TEXT,
  component_type TEXT,
  stock_level INTEGER,
  normal_price NUMERIC,
  merchant_price NUMERIC,
  default_image_url TEXT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id,
    cl.component_sku,
    cl.name,
    cl.description,
    cl.component_type,
    cl.stock_level,
    cl.normal_price,
    cl.merchant_price,
    cl.default_image_url,
    (CASE
      WHEN LOWER(cl.component_sku) = LOWER(search_term) THEN 100
      WHEN LOWER(cl.name) = LOWER(search_term) THEN 95
      WHEN LOWER(cl.component_sku) LIKE LOWER(search_term || '%') THEN 90
      WHEN LOWER(cl.name) LIKE LOWER(search_term || '%') THEN 85
      WHEN LOWER(cl.component_sku) LIKE LOWER('%' || search_term || '%') THEN 80
      WHEN LOWER(cl.name) LIKE LOWER('%' || search_term || '%') THEN 75
      WHEN LOWER(cl.description) LIKE LOWER('%' || search_term || '%') THEN 70
      WHEN LOWER(cl.component_type) LIKE LOWER('%' || search_term || '%') THEN 65
      ELSE 60
    END)::NUMERIC AS relevance_score
  FROM public.component_library cl
  WHERE
    cl.is_active = true
    AND (
      LOWER(cl.component_sku) LIKE LOWER('%' || search_term || '%') OR
      LOWER(cl.name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(cl.description) LIKE LOWER('%' || search_term || '%') OR
      LOWER(cl.component_type) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY relevance_score DESC, cl.name ASC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_components(TEXT) TO anon, authenticated;
