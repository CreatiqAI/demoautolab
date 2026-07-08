-- Phase 1, Stage 2 (group 3): lock rewards/loyalty tables and close the
-- self-serve points/voucher exploit. The legitimate voucher/points read+write
-- paths are switched to SECURITY DEFINER so they keep working once the tables
-- are locked. Verified: anon blocked on owned tables, reward_items public-read,
-- master reads all. Applied remotely.

alter function public.validate_voucher(text, uuid, numeric) security definer set search_path = public, pg_temp;
alter function public.get_available_vouchers_for_checkout(uuid, numeric) security definer set search_path = public, pg_temp;
alter function public.get_available_vouchers_for_customer(uuid) security definer set search_path = public, pg_temp;
alter function public.apply_voucher_to_order(uuid, text, uuid, numeric, numeric) security definer set search_path = public, pg_temp;
alter function public.award_points_on_order_success() security definer set search_path = public, pg_temp;
alter function public.cancel_point_redemption(uuid, uuid, text) security definer set search_path = public, pg_temp;
alter function public.create_merchant_welcome_voucher() security definer set search_path = public, pg_temp;

do $$ declare t text; pol record; begin
  foreach t in array array['voucher_usage','customer_points_ledger','point_redemptions'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for select using ((customer_id = public.current_customer_id()) or public.is_admin())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t||'_del', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='vouchers' loop
    execute format('drop policy if exists %I on public.vouchers', pol.policyname); end loop;
end $$;
create policy vouchers_sel on public.vouchers for select using ((assigned_to_customer_id = public.current_customer_id()) or public.is_admin());
create policy vouchers_ins on public.vouchers for insert with check (public.is_admin());
create policy vouchers_upd on public.vouchers for update using (public.is_admin()) with check (public.is_admin());
create policy vouchers_del on public.vouchers for delete using (public.is_admin());
alter table public.vouchers enable row level security;
revoke all on public.vouchers from anon;
grant select, insert, update, delete on public.vouchers to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='reward_items' loop
    execute format('drop policy if exists %I on public.reward_items', pol.policyname); end loop;
end $$;
create policy reward_items_sel on public.reward_items for select using (true);
create policy reward_items_ins on public.reward_items for insert with check (public.is_admin());
create policy reward_items_upd on public.reward_items for update using (public.is_admin()) with check (public.is_admin());
create policy reward_items_del on public.reward_items for delete using (public.is_admin());
alter table public.reward_items enable row level security;
revoke insert, update, delete on public.reward_items from anon;
grant select on public.reward_items to anon;
grant select, insert, update, delete on public.reward_items to authenticated;
