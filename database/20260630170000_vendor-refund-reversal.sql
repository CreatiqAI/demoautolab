-- ============================================================================
-- Vendor ledger: refund / cancellation reversal
-- ----------------------------------------------------------------------------
-- Sales are credited to a vendor at payment (record_vendor_sale_for_order).
-- Previously nothing ever reversed them, so a refunded/cancelled paid order
-- left the vendor over-credited. These triggers write negative REFUND ledger
-- rows when:
--   1. A paid order is cancelled (orders.status -> 'CANCELLED'), and
--   2. A return's refund is completed (returns.refund_status/status -> done).
--
-- Both reversal functions are idempotent and compose: a partial return reduces
-- the item, and a later full cancellation only reverses the remaining balance.
-- ============================================================================

-- Audit + idempotency link for return-driven reversals.
ALTER TABLE public.vendor_sales_ledger
  ADD COLUMN IF NOT EXISTS reversal_return_id uuid NULL;

-- ----------------------------------------------------------------------------
-- Full-order reversal (cancellation). Reverses whatever net is still
-- un-reversed for each vendor SALE on the order — so it's correct whether the
-- order was untouched or already partially refunded, and a no-op if already
-- fully reversed (idempotent).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_vendor_sales_for_order(
  p_order_id uuid,
  p_reason text DEFAULT 'Order cancelled'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.vendor_sales_ledger (
    vendor_id, order_id, order_item_id, type,
    gross_amount, commission_rate, commission_amount, net_amount, notes
  )
  SELECT
    s.vendor_id, s.order_id, s.order_item_id, 'REFUND',
    -(s.gross_amount      + COALESCE(r.gross_sum, 0)),
    s.commission_rate,
    -(s.commission_amount + COALESCE(r.comm_sum, 0)),
    -(s.net_amount        + COALESCE(r.net_sum, 0)),
    p_reason
  FROM public.vendor_sales_ledger s
  LEFT JOIN LATERAL (
    SELECT SUM(x.gross_amount) AS gross_sum,
           SUM(x.commission_amount) AS comm_sum,
           SUM(x.net_amount) AS net_sum
    FROM public.vendor_sales_ledger x
    WHERE x.order_item_id = s.order_item_id AND x.type = 'REFUND'
  ) r ON true
  WHERE s.order_id = p_order_id
    AND s.type = 'SALE'
    AND (s.net_amount + COALESCE(r.net_sum, 0)) <> 0;  -- only the un-reversed remainder

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Return-driven reversal. Reverses each returned vendor item proportionally to
-- the returned quantity. Idempotent via reversal_return_id (won't double-apply
-- the same return).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_vendor_sales_for_return(p_return_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.vendor_sales_ledger (
    vendor_id, order_id, order_item_id, type,
    gross_amount, commission_rate, commission_amount, net_amount,
    reversal_return_id, notes
  )
  SELECT
    s.vendor_id, s.order_id, s.order_item_id, 'REFUND',
    -ROUND(s.gross_amount * f.frac, 2),
    s.commission_rate,
    -ROUND(s.commission_amount * f.frac, 2),
    -(ROUND(s.gross_amount * f.frac, 2) - ROUND(s.commission_amount * f.frac, 2)),
    p_return_id,
    'Refund for return ' || COALESCE(rr.return_no, p_return_id::text)
  FROM public.returns rr
  JOIN public.return_items ri ON ri.return_id = rr.id
  JOIN public.order_items oi ON oi.id = ri.order_item_id
  JOIN public.vendor_sales_ledger s ON s.order_item_id = ri.order_item_id AND s.type = 'SALE'
  CROSS JOIN LATERAL (
    SELECT LEAST(COALESCE(ri.quantity::numeric / NULLIF(oi.quantity, 0), 1), 1) AS frac
  ) f
  WHERE rr.id = p_return_id
    AND oi.vendor_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.vendor_sales_ledger z
      WHERE z.reversal_return_id = p_return_id
        AND z.order_item_id = ri.order_item_id
        AND z.type = 'REFUND'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_reverse_vendor_sales_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.reverse_vendor_sales_for_order(NEW.id, 'Order cancelled');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reverse_vendor_sales_on_order_cancel ON public.orders;
CREATE TRIGGER reverse_vendor_sales_on_order_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED')
EXECUTE FUNCTION public.trg_reverse_vendor_sales_on_order_cancel();

CREATE OR REPLACE FUNCTION public.trg_reverse_vendor_sales_on_return_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (COALESCE(NEW.refund_status, '') = 'COMPLETED' AND COALESCE(OLD.refund_status, '') <> 'COMPLETED')
     OR (NEW.status = 'COMPLETED' AND COALESCE(OLD.status, '') <> 'COMPLETED') THEN
    PERFORM public.reverse_vendor_sales_for_return(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reverse_vendor_sales_on_return_refund ON public.returns;
CREATE TRIGGER reverse_vendor_sales_on_return_refund
AFTER UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.trg_reverse_vendor_sales_on_return_refund();
