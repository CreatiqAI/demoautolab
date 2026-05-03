-- ============================================================================
-- Merchant subscription tracking
-- ============================================================================
-- B2B merchants pay RM99/year. The subscription year starts the moment the
-- admin approves their merchant_registration. After 1 year they need to renew.
--
-- This migration:
--   1. Adds subscription_start_date / subscription_end_date columns to
--      customer_profiles (status is computed on the fly from end_date so it
--      doesn't need a constantly-updated stored field)
--   2. Extends the existing create_merchant_wallet() approval trigger to set
--      start = NOW(), end = NOW() + 1 year on the first approval
--   3. Backfills existing approved merchants
-- ============================================================================

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date   TIMESTAMPTZ;

COMMENT ON COLUMN public.customer_profiles.subscription_start_date IS
  'Set when the merchant_registration is first APPROVED. RM99/year subscription.';
COMMENT ON COLUMN public.customer_profiles.subscription_end_date IS
  'Subscription expiry. Renewal due when expired.';

-- Extend the existing approval trigger function. It already sets customer_type
-- and creates the wallet — now also stamps subscription dates if missing.
CREATE OR REPLACE FUNCTION public.create_merchant_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    UPDATE public.customer_profiles
    SET customer_type = 'merchant',
        pricing_type = 'wholesale',
        subscription_start_date = COALESCE(subscription_start_date, NOW()),
        subscription_end_date   = COALESCE(subscription_end_date, NOW() + INTERVAL '1 year')
    WHERE id = NEW.customer_id;

    INSERT INTO public.merchant_wallets (customer_id)
    VALUES (NEW.customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: existing approved merchants. Use approved_at if present, else
-- registration created_at, else fall back to NOW().
UPDATE public.customer_profiles cp
SET subscription_start_date = COALESCE(mr.approved_at, mr.created_at, NOW()),
    subscription_end_date   = COALESCE(mr.approved_at, mr.created_at, NOW()) + INTERVAL '1 year'
FROM public.merchant_registrations mr
WHERE mr.customer_id = cp.id
  AND mr.status = 'APPROVED'
  AND cp.subscription_start_date IS NULL;
