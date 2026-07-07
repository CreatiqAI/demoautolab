-- Distinct component types for the Component Library type dropdown.
--
-- Problem: the admin UI derived the type list by fetching every
-- component_library row and computing DISTINCT client-side. Supabase caps
-- each query at 1000 rows, so once the table grew past 1000 components, any
-- type that only existed in newer rows (e.g. a freshly created type) was
-- silently dropped from the dropdown.
--
-- Fix: compute DISTINCT in Postgres and return the small result set.
-- SECURITY DEFINER so the admin console can read the full type list
-- regardless of row-level policies on component_library.

CREATE OR REPLACE FUNCTION public.get_component_library_types()
RETURNS TABLE (component_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT cl.component_type
  FROM public.component_library cl
  WHERE cl.component_type IS NOT NULL
    AND btrim(cl.component_type) <> ''
  ORDER BY cl.component_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_component_library_types() TO anon, authenticated, service_role;
