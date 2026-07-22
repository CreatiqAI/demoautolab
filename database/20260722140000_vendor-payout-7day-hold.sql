-- Vendor cashout hold: a SALE ledger row only becomes payable once 7 days have
-- passed since the ORDER was placed (orders.created_at). Refund/adjustment rows
-- apply immediately. Gate lives in the admin RPCs (source of truth) so the pending
-- balance and payout generation both respect it. Applied 2026-07-22.

CREATE OR REPLACE FUNCTION public.admin_vendor_pending_balances()
 RETURNS TABLE(vendor_id uuid, pending_net numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.vendor_id, COALESCE(SUM(l.net_amount), 0)::numeric AS pending_net
  FROM vendor_sales_ledger l
  LEFT JOIN orders o ON o.id = l.order_id
  WHERE l.payout_id IS NULL
    AND (l.type <> 'SALE' OR o.created_at <= now() - INTERVAL '7 days')
  GROUP BY l.vendor_id
$function$;

CREATE OR REPLACE FUNCTION public.admin_generate_vendor_payout_impl(p_vendor_id uuid, p_period_start date, p_period_end date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    AND created_at < (p_period_end + INTERVAL '1 day')
    AND (type <> 'SALE' OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = vendor_sales_ledger.order_id
        AND o.created_at <= now() - INTERVAL '7 days'));

  IF v_net <= 0 THEN
    RAISE EXCEPTION 'Nothing to pay out for vendor % in period %..% (orders within the 7-day holding period are excluded)', p_vendor_id, p_period_start, p_period_end;
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

  UPDATE public.vendor_sales_ledger
  SET payout_id = v_payout_id
  WHERE vendor_id = p_vendor_id
    AND payout_id IS NULL
    AND created_at >= p_period_start
    AND created_at < (p_period_end + INTERVAL '1 day')
    AND (type <> 'SALE' OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = vendor_sales_ledger.order_id
        AND o.created_at <= now() - INTERVAL '7 days'));

  RETURN v_payout_id;
END;
$function$;
