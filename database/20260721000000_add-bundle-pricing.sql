-- Bundle pricing: a product can define one fixed "buy the whole set" price
-- (separate for normal vs merchant customers). The admin flags which components
-- form the bundle via product_components.is_bundle_item. All additive + nullable,
-- so existing products are unaffected (bundle_enabled defaults false).
-- Applied to remote 2026-07-21 via MCP (migration name: add_bundle_pricing).

alter table public.products_new
  add column if not exists bundle_enabled boolean not null default false,
  add column if not exists bundle_price numeric,
  add column if not exists bundle_merchant_price numeric,
  add column if not exists bundle_label text;

alter table public.product_components
  add column if not exists is_bundle_item boolean not null default false;

comment on column public.products_new.bundle_price is
  'Fixed total price when all bundle components are bought together (normal customers). NULL = no bundle.';
comment on column public.products_new.bundle_merchant_price is
  'Fixed bundle total for merchant (B2B) customers. NULL falls back to bundle_price.';
comment on column public.product_components.is_bundle_item is
  'True if this component is part of the product bundle set (drives bundle pricing).';
