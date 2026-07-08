-- Fix the over-aggressive RLS lockdown from the 2026-07-08 rebuild.
-- Symptoms this repairs:
--   * Admin "Vendor Fulfilments" / "Vendor Payouts" pages empty (admin had no read policy)
--   * Product create/edit form stalled + vendor Select empty (admin couldn't read vendors)
--   * premium_partnerships PATCH 400 (merchant could no longer self-edit their listing)
--   * admin_audit_log 409 + get-bulk-import-logs 401/403 (client stored auth uid, not admin_profiles.id)
--   * Storefront "Sold by <vendor>" vanished (vendors table locked to owner+admin)

-- 1) Admins can read/manage the vendor operational tables (were owner-only).
create policy vfulfil_admin  on public.vendor_fulfilments   for all using (public.is_admin()) with check (public.is_admin());
create policy vpayouts_admin on public.vendor_payouts       for all using (public.is_admin()) with check (public.is_admin());
create policy vledger_admin  on public.vendor_sales_ledger  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Admins can read/manage the vendors registry (was ONLY vendors_self_select).
create policy vendors_admin  on public.vendors             for all using (public.is_admin()) with check (public.is_admin());

-- 3) Merchants may edit their OWN partnership again; a trigger blocks non-admins
--    from touching approval / subscription / slot / fee columns (no self-approval).
drop policy if exists pp_upd on public.premium_partnerships;
create policy pp_upd on public.premium_partnerships for update
  using ((merchant_id = public.current_customer_id()) or public.is_admin())
  with check ((merchant_id = public.current_customer_id()) or public.is_admin());

create or replace function public.guard_partnership_admin_fields() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    if coalesce(new.admin_approved,false)      is distinct from coalesce(old.admin_approved,false)
       or coalesce(new.subscription_status,'') is distinct from coalesce(old.subscription_status,'')
       or coalesce(new.subscription_plan,'')   is distinct from coalesce(old.subscription_plan,'')
       or coalesce(new.panel_slot_number,-1)   is distinct from coalesce(old.panel_slot_number,-1)
       or coalesce(new.is_admin_invited,false) is distinct from coalesce(old.is_admin_invited,false)
       or coalesce(new.yearly_fee,0)           is distinct from coalesce(old.yearly_fee,0) then
      raise exception 'Only an admin can change approval, subscription status, panel slot, or fees';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_partnership on public.premium_partnerships;
create trigger trg_guard_partnership before update on public.premium_partnerships
  for each row execute function public.guard_partnership_admin_fields();

-- 4) Resolve the correct admin_profiles.id for the current admin session so the
--    client stores it (audit-log FK + edge functions key off it, not the auth uid).
create or replace function public.get_admin_context() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select case when not public.is_admin() then null
    else (select jsonb_build_object('id', ap.id, 'username', ap.username,
                                    'full_name', ap.full_name, 'role', ap.role)
          from public.admin_profiles ap
          where lower(ap.username) = lower(auth.jwt() ->> 'email') and ap.is_active
          limit 1) end;
$$;
grant execute on function public.get_admin_context() to authenticated;

-- 5) Public-safe projection of vendors (name + logo of approved vendors only) so
--    the storefront can show "Sold by ..." without exposing bank/tax/commission.
--    Intentionally a SECURITY DEFINER view (the only way to publish safe columns
--    while the base table stays RLS-locked; customers & vendors share one role).
create or replace view public.vendors_public with (security_invoker = off) as
  select id, business_name, logo_url from public.vendors where status = 'approved';
grant select on public.vendors_public to anon, authenticated;
