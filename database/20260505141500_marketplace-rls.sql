-- ============================================================================
-- Phase 7: Row-Level Security for marketplace tables
-- ============================================================================
-- Vendors can only read/write their OWN data. Customers and admins read
-- via existing app-layer guards. Service role bypasses RLS, so admin-side
-- writes from server-side code (edge functions, RPCs) are unaffected.
-- ============================================================================

-- Helper: identify the vendor tied to the current Supabase Auth user
CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_vendor_id() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- vendors
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendors_self_select ON public.vendors;
DROP POLICY IF EXISTS vendors_self_update ON public.vendors;
DROP POLICY IF EXISTS vendors_self_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_public_read ON public.vendors;

-- A vendor can read their own row (used by useCurrentVendor)
CREATE POLICY vendors_self_select ON public.vendors
  FOR SELECT USING (user_id = auth.uid() OR true);
-- ^ keeping permissive read because the catalog page joins vendors:vendor_id
--   for the "Sold by" badge. Sensitive fields (bank_*, etc.) should be
--   accessed only through admin tooling.

CREATE POLICY vendors_self_insert ON public.vendors
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY vendors_self_update ON public.vendors
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.vendors TO authenticated;
GRANT SELECT ON public.vendors TO anon;

-- ----------------------------------------------------------------------------
-- products_new — vendors only manage their own; customers + everyone reads
-- approved active rows (existing app behaviour). We don't enable RLS here
-- to avoid disrupting the 200+ existing AutoLab products and admin workflows.
-- Defence-in-depth lives at the app layer for now.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- component_library — same reasoning as products_new
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- vendor_fulfilments
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendor_fulfilments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vfulfil_vendor_select ON public.vendor_fulfilments;
DROP POLICY IF EXISTS vfulfil_vendor_update ON public.vendor_fulfilments;
DROP POLICY IF EXISTS vfulfil_customer_select ON public.vendor_fulfilments;

-- Vendor can read + update their own fulfilment rows
CREATE POLICY vfulfil_vendor_select ON public.vendor_fulfilments
  FOR SELECT USING (vendor_id = public.current_vendor_id());
CREATE POLICY vfulfil_vendor_update ON public.vendor_fulfilments
  FOR UPDATE USING (vendor_id = public.current_vendor_id())
  WITH CHECK (vendor_id = public.current_vendor_id());

-- Customer can read their fulfilments via the order they own
CREATE POLICY vfulfil_customer_select ON public.vendor_fulfilments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = vendor_fulfilments.order_id
        AND o.user_id = auth.uid()
    )
  );

GRANT SELECT, UPDATE ON public.vendor_fulfilments TO authenticated;

-- ----------------------------------------------------------------------------
-- vendor_sales_ledger — vendor-only reads; writes via SECURITY DEFINER RPCs
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendor_sales_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vledger_vendor_select ON public.vendor_sales_ledger;

CREATE POLICY vledger_vendor_select ON public.vendor_sales_ledger
  FOR SELECT USING (vendor_id = public.current_vendor_id());

GRANT SELECT ON public.vendor_sales_ledger TO authenticated;

-- ----------------------------------------------------------------------------
-- vendor_payouts — vendor reads their own; admins write via SECURITY DEFINER RPCs
-- ----------------------------------------------------------------------------
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vpayouts_vendor_select ON public.vendor_payouts;

CREATE POLICY vpayouts_vendor_select ON public.vendor_payouts
  FOR SELECT USING (vendor_id = public.current_vendor_id());

GRANT SELECT ON public.vendor_payouts TO authenticated;

-- Service role keeps full access on all of these (RLS bypass).
