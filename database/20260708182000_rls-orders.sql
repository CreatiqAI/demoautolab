-- Phase 1, Stage 2 (group 2b): lock down orders + order_items.
-- orders: owner (customer via user_id) + admin; checkout is a SECURITY DEFINER
-- RPC that bypasses RLS; warehouse staff are admins (ProtectedAdminRoute).
-- order_items: admin, the owning customer (via parent order), or the line's vendor.
-- Verified: anon blocked, master reads all, customer auto-scoped. Applied remotely.

create or replace function public.current_vendor_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.vendors where user_id = (select auth.uid()) limit 1;
$$;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='orders' loop
    execute format('drop policy if exists %I on public.orders', pol.policyname);
  end loop;
end $$;
create policy orders_sel on public.orders for select using ((user_id = (select auth.uid())) or public.is_admin());
create policy orders_ins on public.orders for insert with check ((user_id = (select auth.uid())) or public.is_admin());
create policy orders_upd on public.orders for update using ((user_id = (select auth.uid())) or public.is_admin()) with check ((user_id = (select auth.uid())) or public.is_admin());
create policy orders_del on public.orders for delete using (public.is_admin());
alter table public.orders enable row level security;
revoke all on public.orders from anon;
grant select, insert, update, delete on public.orders to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='order_items' loop
    execute format('drop policy if exists %I on public.order_items', pol.policyname);
  end loop;
end $$;
create policy oi_sel on public.order_items for select using (
  public.is_admin()
  or (vendor_id = public.current_vendor_id())
  or exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = (select auth.uid()))
);
create policy oi_ins on public.order_items for insert with check (public.is_admin());
create policy oi_upd on public.order_items for update using (public.is_admin()) with check (public.is_admin());
create policy oi_del on public.order_items for delete using (public.is_admin());
alter table public.order_items enable row level security;
revoke all on public.order_items from anon;
grant select, insert, update, delete on public.order_items to authenticated;
