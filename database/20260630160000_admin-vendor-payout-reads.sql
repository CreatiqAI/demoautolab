-- ============================================================================
-- Admin reads for Vendor Payouts
-- ----------------------------------------------------------------------------
-- AutoLab admins authenticate via localStorage, so to Postgres they are the
-- anonymous client. vendor_sales_ledger / vendor_payouts are RLS-scoped to
-- `vendor_id = current_vendor_id()`, which is NULL for anon → the admin reads
-- ZERO rows and every pending balance / payout shows as empty.
--
-- These SECURITY DEFINER functions expose exactly the aggregates/list the admin
-- Vendor Payouts page needs, without loosening RLS for vendors. (Same callable-
-- by-anon exposure as the existing admin_generate_vendor_payout RPC.)
-- ============================================================================

-- Net unpaid balance per vendor (mirrors the vendor page's pending-balance calc:
-- sum of net_amount over ledger rows not yet attached to a payout).
CREATE OR REPLACE FUNCTION public.admin_vendor_pending_balances()
RETURNS TABLE(vendor_id uuid, pending_net numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT l.vendor_id, COALESCE(SUM(l.net_amount), 0)::numeric AS pending_net
  FROM vendor_sales_ledger l
  WHERE l.payout_id IS NULL
  GROUP BY l.vendor_id
$function$;

GRANT EXECUTE ON FUNCTION public.admin_vendor_pending_balances() TO anon, authenticated;

-- Every generated payout across all vendors (newest first).
CREATE OR REPLACE FUNCTION public.admin_list_vendor_payouts(p_limit integer DEFAULT 500)
RETURNS SETOF public.vendor_payouts
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT *
  FROM vendor_payouts
  ORDER BY created_at DESC
  LIMIT GREATEST(p_limit, 1)
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_vendor_payouts(integer) TO anon, authenticated;
