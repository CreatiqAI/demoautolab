-- ============================================================================
-- Panel customer flow — payment slip column + reset stale flag
-- ============================================================================
-- Promoting a merchant to Panel tier requires uploading a payment slip
-- (RM350/month subscription proof). Add the column to premium_partnerships
-- so the admin Promote-to-Panel flow has somewhere to store it.
--
-- Also reset CreatiqAI's stale is_panel_customer=true: the previous toggle
-- updated customer_profiles but the matching premium_partnerships row insert
-- silently failed (errors were never captured). The new flow is gated on
-- a successful premium_partnerships insert, so flags can't drift again.
-- ============================================================================

ALTER TABLE public.premium_partnerships
  ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

COMMENT ON COLUMN public.premium_partnerships.payment_slip_url IS
  'URL to admin-uploaded payment slip proving the panel-tier subscription payment.';

-- Reset stale flag set by the previous broken toggle.
UPDATE public.customer_profiles
SET is_panel_customer = false
WHERE is_panel_customer = true
  AND id NOT IN (SELECT merchant_id FROM public.premium_partnerships WHERE subscription_status = 'ACTIVE' AND subscription_plan = 'panel');
