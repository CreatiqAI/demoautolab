-- ============================================================================
-- Demotion tracking on customer_profiles
-- ============================================================================
-- When a B2B merchant doesn't renew, admin demotes them back to B2C. We need
-- a record of the demotion for support / audit purposes (so we don't just
-- lose the fact they were ever a merchant).
-- ============================================================================

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS demoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demoted_from TEXT,
  ADD COLUMN IF NOT EXISTS demotion_reason TEXT;

COMMENT ON COLUMN public.customer_profiles.demoted_at IS 'Timestamp when admin demoted this customer (e.g. merchant -> normal).';
COMMENT ON COLUMN public.customer_profiles.demoted_from IS 'The customer_type the user was demoted from (typically "merchant").';
COMMENT ON COLUMN public.customer_profiles.demotion_reason IS 'Optional admin note explaining the demotion (e.g. "Did not renew RM99 subscription").';

-- Recreate the RPC to surface the new columns to the admin Customers page.
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
  last_sign_in_at timestamptz,
  demoted_at timestamptz,
  demoted_from text,
  demotion_reason text
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
    cp.is_panel_customer, au.last_sign_in_at,
    cp.demoted_at, cp.demoted_from, cp.demotion_reason
  FROM public.customer_profiles cp
  LEFT JOIN auth.users au ON au.id = cp.user_id
  ORDER BY cp.updated_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_customer_profiles() TO authenticated, anon;
