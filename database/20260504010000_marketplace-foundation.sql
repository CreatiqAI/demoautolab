-- ============================================================================
-- Multi-vendor marketplace — Phase 1 foundation
-- ============================================================================
-- Adds the vendors entity + ownership columns on products_new, component_library,
-- order_items, plus a vendor_fulfilments table to track per-vendor shipping
-- inside a single customer order.
--
-- AutoLab's existing products / components / order items are unowned (vendor_id
-- IS NULL). Vendor-uploaded items get vendor_id set. The catalog query will
-- filter by approval_status='APPROVED' so pending vendor items don't leak.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  business_registration_no TEXT,
  tax_id TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  description TEXT,
  logo_url TEXT,
  -- Banking — for monthly payouts
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  -- Compliance flag
  is_sst_registered BOOLEAN NOT NULL DEFAULT false,
  -- Commercial terms
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  default_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','SUSPENDED','REJECTED')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_status_created ON public.vendors(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);

COMMENT ON TABLE public.vendors IS
  'External business partners authorised to sell via AutoLab. Distinct from admin_profiles (staff) and customer_profiles (buyers).';
COMMENT ON COLUMN public.vendors.commission_rate IS
  'Platform commission percentage AutoLab keeps from each sale. Default 8% — configurable per vendor.';
COMMENT ON COLUMN public.vendors.user_id IS
  'Supabase Auth user_id. Vendors authenticate via email/password and ProtectedVendorRoute looks up the vendor row by this column.';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vendors_updated_at ON public.vendors;
CREATE TRIGGER trigger_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vendors_updated_at();

-- ----------------------------------------------------------------------------
-- Add vendor ownership + approval status to products_new and component_library
-- AutoLab's existing rows: vendor_id IS NULL, approval_status='APPROVED' (default)
-- so they keep working without backfill.
-- ----------------------------------------------------------------------------

ALTER TABLE public.products_new
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (approval_status IN ('PENDING','APPROVED','REJECTED','HIDDEN')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_products_new_vendor_status
  ON public.products_new(vendor_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_products_new_approval_status
  ON public.products_new(approval_status) WHERE approval_status <> 'APPROVED';

ALTER TABLE public.component_library
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (approval_status IN ('PENDING','APPROVED','REJECTED','HIDDEN'));

CREATE INDEX IF NOT EXISTS idx_component_library_vendor_status
  ON public.component_library(vendor_id, approval_status);

-- ----------------------------------------------------------------------------
-- Tag each order_item with the seller. AutoLab items: vendor_id IS NULL.
-- ----------------------------------------------------------------------------

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_vendor_id ON public.order_items(vendor_id);

-- ----------------------------------------------------------------------------
-- Per-vendor fulfilment: one row per (order, vendor) so each seller has their
-- own shipping pipeline within a customer's single order.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendor_fulfilments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  tracking_number TEXT,
  tracking_provider TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_fulfilments_vendor_status
  ON public.vendor_fulfilments(vendor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_fulfilments_order
  ON public.vendor_fulfilments(order_id);

COMMENT ON TABLE public.vendor_fulfilments IS
  'One row per (order, vendor) tracking that vendors fulfilment of their items inside the customer order.';

DROP TRIGGER IF EXISTS trigger_vendor_fulfilments_updated_at ON public.vendor_fulfilments;
CREATE TRIGGER trigger_vendor_fulfilments_updated_at
  BEFORE UPDATE ON public.vendor_fulfilments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vendors_updated_at();
