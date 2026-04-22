-- ============================================================================
-- ADD payment_slip_url COLUMN TO merchant_registrations
-- Purpose: Store URL of the RM99 annual subscription payment slip uploaded
--          during merchant registration. The MerchantRegister form already
--          requires this file, but the column was missing, causing a 400
--          Bad Request on insert.
-- ============================================================================

ALTER TABLE public.merchant_registrations
  ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

COMMENT ON COLUMN public.merchant_registrations.payment_slip_url IS
  'URL to uploaded payment slip proving RM99 annual subscription payment';
