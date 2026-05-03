-- ============================================================================
-- B2B / B2C admin redesign — supporting DB changes
-- ============================================================================
-- 1. Add is_panel_customer flag so admin can promote a B2B merchant to
--    "panel customer". Business semantics (different pricing, exclusive
--    features, etc.) can be wired later — the column is here so the
--    promotion UI works.
-- 2. Extend get_all_customer_profiles to also return last_sign_in_at from
--    auth.users. The Customers admin list needs to show "last login" for
--    both B2C and B2B rows.
-- ============================================================================

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS is_panel_customer BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.customer_profiles.is_panel_customer IS
  'Admin-toggleable flag promoting a B2B merchant to panel-tier status.';

-- Drop the existing RPC so we can change its return shape.
DROP FUNCTION IF EXISTS public.get_all_customer_profiles();

CREATE OR REPLACE FUNCTION public.get_all_customer_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  phone text,
  email text,
  customer_type text,
  date_of_birth date,
  gender text,
  address jsonb,
  preferences jsonb,
  is_active boolean,
  updated_at timestamptz,
  car_make_id uuid,
  car_make_name text,
  car_model_id uuid,
  car_model_name text,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  is_panel_customer boolean,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id, cp.user_id, cp.full_name, cp.phone, cp.email, cp.customer_type,
    cp.date_of_birth, cp.gender, cp.address, cp.preferences, cp.is_active,
    cp.updated_at, cp.car_make_id, cp.car_make_name, cp.car_model_id,
    cp.car_model_name, cp.subscription_start_date, cp.subscription_end_date,
    cp.is_panel_customer, au.last_sign_in_at
  FROM public.customer_profiles cp
  LEFT JOIN auth.users au ON au.id = cp.user_id
  ORDER BY cp.updated_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_customer_profiles() TO authenticated, anon;
