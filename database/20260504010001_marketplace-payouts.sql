-- ============================================================================
-- Multi-vendor marketplace — Phase 6: money layer
-- ============================================================================
-- Adds the per-line sales ledger + monthly payout summary tables, plus the
-- RPCs the order-paid flow and admin payout-generator call.
--
-- Flow:
--   1. Customer pays an order → record_vendor_sale_for_order(order_id) inserts
--      one SALE row per vendor's order_item with the platform commission and
--      net payable already calculated.
--   2. Once a month, admin calls admin_generate_vendor_payout(vendor, start, end)
--      which aggregates unpaid ledger rows into a vendor_payouts row and
--      links the rows back via payout_id (so they can't be paid twice).
--   3. Admin marks the payout PAID after the bank transfer, uploading the
--      slip to the vendor-payout-slips storage bucket.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. vendor_sales_ledger — per-line ledger (one row per sale-related event)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_sales_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id),
  order_item_id UUID REFERENCES public.order_items(id),
  type TEXT NOT NULL CHECK (type IN ('SALE','REFUND','ADJUSTMENT','PAYOUT')),
  gross_amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  payout_id UUID,                         -- backfilled after payout creation; FK added below
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_vendor_sales_ledger_vendor_payout
  ON public.vendor_sales_ledger(vendor_id, payout_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_sales_ledger_vendor_type
  ON public.vendor_sales_ledger(vendor_id, type, created_at DESC);

COMMENT ON TABLE public.vendor_sales_ledger IS
  'One row per sale-related event for a vendor. Source of truth for monthly payout totals.';
COMMENT ON COLUMN public.vendor_sales_ledger.payout_id IS
  'Set when the row is rolled into a vendor_payouts batch. NULL = unpaid balance.';

-- ----------------------------------------------------------------------------
-- 2. vendor_payouts — monthly payout summary (one row per vendor per period)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAID','HOLD','CANCELLED')),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.admin_profiles(id),
  payment_reference TEXT,
  payment_slip_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor_status
  ON public.vendor_payouts(vendor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status_created
  ON public.vendor_payouts(status, created_at DESC);

COMMENT ON TABLE public.vendor_payouts IS
  'Monthly payout summary aggregating ledger rows for one vendor in one period.';

-- ----------------------------------------------------------------------------
-- 3. FK from ledger.payout_id → vendor_payouts.id (added after both tables exist)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_sales_ledger_payout_fk'
  ) THEN
    ALTER TABLE public.vendor_sales_ledger
      ADD CONSTRAINT vendor_sales_ledger_payout_fk
      FOREIGN KEY (payout_id) REFERENCES public.vendor_payouts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. record_vendor_sale_for_order — called from the payment-success flow.
--    Inserts SALE rows for every order_item with a vendor_id, idempotent on
--    re-call (skips items already in the ledger).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_vendor_sale_for_order(p_order_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.vendor_sales_ledger (
    vendor_id, order_id, order_item_id, type,
    gross_amount, commission_rate, commission_amount, net_amount, notes
  )
  SELECT
    oi.vendor_id, oi.order_id, oi.id, 'SALE',
    oi.total_price,
    v.commission_rate,
    ROUND(oi.total_price * v.commission_rate / 100.0, 2),
    oi.total_price - ROUND(oi.total_price * v.commission_rate / 100.0, 2),
    NULL
  FROM public.order_items oi
  JOIN public.vendors v ON v.id = oi.vendor_id
  WHERE oi.order_id = p_order_id
    AND oi.vendor_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.vendor_sales_ledger l
      WHERE l.order_item_id = oi.id AND l.type = 'SALE'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_vendor_sale_for_order(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.record_vendor_sale_for_order(UUID) IS
  'Idempotently writes SALE ledger rows for all vendor-owned items in an order. Returns row count inserted.';

-- ----------------------------------------------------------------------------
-- 5. admin_generate_vendor_payout — aggregates unpaid ledger rows into a
--    vendor_payouts row, then links those ledger rows to the new payout so
--    they can't be double-counted in the next run.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_generate_vendor_payout(
  p_vendor_id UUID,
  p_period_start DATE,
  p_period_end DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payout_id UUID;
  v_gross NUMERIC(12,2) := 0;
  v_commission NUMERIC(12,2) := 0;
  v_refund NUMERIC(12,2) := 0;
  v_net NUMERIC(12,2) := 0;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN type='SALE' THEN gross_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type='SALE' THEN commission_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type='REFUND' THEN ABS(net_amount) ELSE 0 END), 0),
    COALESCE(SUM(net_amount), 0)
  INTO v_gross, v_commission, v_refund, v_net
  FROM public.vendor_sales_ledger
  WHERE vendor_id = p_vendor_id
    AND payout_id IS NULL
    AND created_at >= p_period_start
    AND created_at < (p_period_end + INTERVAL '1 day');

  IF v_net <= 0 THEN
    RAISE EXCEPTION 'Nothing to pay out for vendor % in period %..%', p_vendor_id, p_period_start, p_period_end;
  END IF;

  INSERT INTO public.vendor_payouts (
    vendor_id, period_start, period_end,
    gross_sales, commission_amount, refund_deductions, net_payable,
    status
  ) VALUES (
    p_vendor_id, p_period_start, p_period_end,
    v_gross, v_commission, v_refund, v_net,
    'PENDING'
  )
  RETURNING id INTO v_payout_id;

  -- Link the ledger rows to this payout so they're not double-counted.
  UPDATE public.vendor_sales_ledger
  SET payout_id = v_payout_id
  WHERE vendor_id = p_vendor_id
    AND payout_id IS NULL
    AND created_at >= p_period_start
    AND created_at < (p_period_end + INTERVAL '1 day');

  RETURN v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_generate_vendor_payout(UUID, DATE, DATE) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_generate_vendor_payout(UUID, DATE, DATE) IS
  'Builds a vendor_payouts row from unpaid ledger rows in the given period. Returns the new payout id.';

-- ----------------------------------------------------------------------------
-- 6. Storage bucket for payment slips uploaded by admin when marking PAID
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-payout-slips',
  'vendor-payout-slips',
  true,        -- public so admins (and the vendor themselves) can preview without signed URL
  10485760,    -- 10 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies — allow authenticated users to upload + everyone to view (matches
-- merchant-documents pattern). Admin-only is enforced at the application layer.
DROP POLICY IF EXISTS "Authenticated users can upload payout slips" ON storage.objects;
CREATE POLICY "Authenticated users can upload payout slips"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-payout-slips');

DROP POLICY IF EXISTS "Authenticated users can update payout slips" ON storage.objects;
CREATE POLICY "Authenticated users can update payout slips"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vendor-payout-slips');

DROP POLICY IF EXISTS "Public can view payout slips" ON storage.objects;
CREATE POLICY "Public can view payout slips"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vendor-payout-slips');
