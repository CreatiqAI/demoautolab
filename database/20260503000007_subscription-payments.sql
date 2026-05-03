-- ============================================================================
-- customer_subscription_payments: audit trail for B2B + Panel renewals
-- ============================================================================
-- Each B2B (RM99/year) or Panel (RM350/month) subscription extension creates
-- one row here. The latest row for a customer represents the current period.
-- The drawer's Payment History section reads from this table.
--
-- Note on naming: a `subscription_payments` table already exists (it's tied
-- to premium_partnerships and uses partnership_id). To avoid a confusing
-- mixed-purpose table, this audit trail lives in
-- customer_subscription_payments instead.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('b2b', 'panel')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_slip_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_csp_customer ON public.customer_subscription_payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csp_type ON public.customer_subscription_payments(subscription_type, created_at DESC);

-- Backfill: one row per existing approved B2B merchant representing their
-- initial year. Slip URL is taken from merchant_registrations if available,
-- else a sentinel value the UI can flag.
INSERT INTO public.customer_subscription_payments (
  customer_id, subscription_type, period_start, period_end, amount, payment_slip_url, notes
)
SELECT
  cp.id,
  'b2b',
  cp.subscription_start_date,
  cp.subscription_end_date,
  99.00,
  COALESCE(mr.payment_slip_url, 'legacy://no-slip-on-record'),
  'Backfilled from initial merchant approval'
FROM public.customer_profiles cp
LEFT JOIN public.merchant_registrations mr
  ON mr.customer_id = cp.id AND mr.status = 'APPROVED'
WHERE cp.customer_type = 'merchant'
  AND cp.subscription_start_date IS NOT NULL
  AND cp.subscription_end_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_subscription_payments sp
    WHERE sp.customer_id = cp.id AND sp.subscription_type = 'b2b'
  );

-- Backfill panel payments for active premium_partnerships rows.
INSERT INTO public.customer_subscription_payments (
  customer_id, subscription_type, period_start, period_end, amount, payment_slip_url, notes
)
SELECT
  pp.merchant_id,
  'panel',
  pp.subscription_start_date,
  pp.subscription_end_date,
  350.00,
  COALESCE(pp.payment_slip_url, 'legacy://no-slip-on-record'),
  'Backfilled from initial panel promotion'
FROM public.premium_partnerships pp
WHERE pp.subscription_status = 'ACTIVE'
  AND pp.subscription_plan = 'panel'
  AND pp.subscription_start_date IS NOT NULL
  AND pp.subscription_end_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_subscription_payments sp
    WHERE sp.customer_id = pp.merchant_id AND sp.subscription_type = 'panel'
  );
