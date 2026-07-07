-- Distinct active product brands for the Header mega-menu.
--
-- Same class of bug as get_component_library_types(): the Header derived the
-- brand list by fetching every active products_new row and de-duplicating
-- client-side. Supabase caps each query at 1000 rows, so once active products
-- exceed 1000 the brand list silently truncates. Compute DISTINCT in Postgres
-- instead.

CREATE OR REPLACE FUNCTION public.get_product_brands()
RETURNS TABLE (brand text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.brand
  FROM public.products_new p
  WHERE p.active = true
    AND p.brand IS NOT NULL
    AND btrim(p.brand) <> ''
  ORDER BY p.brand;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_brands() TO anon, authenticated, service_role;
