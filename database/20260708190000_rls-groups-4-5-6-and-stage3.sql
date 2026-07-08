-- Phase 1, Stage 2 (groups 4-6) + Stage 3 revokes. Already applied to remote DB.
-- Verified: anon still reads the public catalog; anon blocked on all private data;
-- vendors write only their own products; anon cannot call admin_* RPCs.
-- Helpers current_customer_id()/current_vendor_id()/is_admin() defined earlier.
-- After this, every public base table has RLS enabled (0 without).

-- ===== Group 5: catalog (PUBLIC read, admin + owning-vendor write) =====
do $$ declare t text; pol record; begin
  foreach t in array array['products_new','component_library'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for select using (true)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin() or (vendor_id = public.current_vendor_id()))', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_admin() or (vendor_id = public.current_vendor_id())) with check (public.is_admin() or (vendor_id = public.current_vendor_id()))', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin() or (vendor_id = public.current_vendor_id()))', t||'_del', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- product_images_new + product_components: public read; write via admin or the vendor owning the parent product
do $$ declare t text; pol record; begin
  foreach t in array array['product_images_new','product_components'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for select using (true)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin() or exists (select 1 from public.products_new p where p.id = %I.product_id and p.vendor_id = public.current_vendor_id()))', t||'_ins', t, t);
    execute format('create policy %I on public.%I for update using (public.is_admin() or exists (select 1 from public.products_new p where p.id = %I.product_id and p.vendor_id = public.current_vendor_id())) with check (public.is_admin() or exists (select 1 from public.products_new p where p.id = %I.product_id and p.vendor_id = public.current_vendor_id()))', t||'_upd', t, t, t);
    execute format('create policy %I on public.%I for delete using (public.is_admin() or exists (select 1 from public.products_new p where p.id = %I.product_id and p.vendor_id = public.current_vendor_id()))', t||'_del', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Public-read + admin-write config
do $$ declare t text; pol record; begin
  foreach t in array array['car_makes','car_models','manufacturers','screen_sizes','customer_tiers','installation_guides'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for select using (true)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t||'_del', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- categories: public read, any signed-in user may add, admin edits/deletes
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='categories' loop
    execute format('drop policy if exists %I on public.categories', pol.policyname); end loop;
end $$;
create policy categories_sel on public.categories for select using (true);
create policy categories_ins on public.categories for insert with check (public.is_admin() or (select auth.uid()) is not null);
create policy categories_upd on public.categories for update using (public.is_admin()) with check (public.is_admin());
create policy categories_del on public.categories for delete using (public.is_admin());
alter table public.categories enable row level security;
revoke insert, update, delete on public.categories from anon;
grant select on public.categories to anon; grant select, insert, update, delete on public.categories to authenticated;

-- ===== Group 4: merchant/partnership (status/approval ADMIN-ONLY) =====
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='premium_partnerships' loop
    execute format('drop policy if exists %I on public.premium_partnerships', pol.policyname); end loop;
end $$;
create policy pp_sel on public.premium_partnerships for select using ((merchant_id = public.current_customer_id()) or public.is_admin());
create policy pp_ins on public.premium_partnerships for insert with check (public.is_admin() or (merchant_id = public.current_customer_id()));
create policy pp_upd on public.premium_partnerships for update using (public.is_admin()) with check (public.is_admin());
create policy pp_del on public.premium_partnerships for delete using (public.is_admin());
alter table public.premium_partnerships enable row level security;
revoke all on public.premium_partnerships from anon; grant select, insert, update, delete on public.premium_partnerships to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='subscription_payments' loop
    execute format('drop policy if exists %I on public.subscription_payments', pol.policyname); end loop;
end $$;
create policy sp_sel on public.subscription_payments for select using (public.is_admin() or exists (select 1 from public.premium_partnerships pp where pp.id = subscription_payments.partnership_id and pp.merchant_id = public.current_customer_id()));
create policy sp_ins on public.subscription_payments for insert with check (public.is_admin());
create policy sp_upd on public.subscription_payments for update using (public.is_admin()) with check (public.is_admin());
create policy sp_del on public.subscription_payments for delete using (public.is_admin());
alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon; grant select, insert, update, delete on public.subscription_payments to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='merchant_registrations' loop
    execute format('drop policy if exists %I on public.merchant_registrations', pol.policyname); end loop;
end $$;
create policy mr_sel on public.merchant_registrations for select using ((customer_id = public.current_customer_id()) or public.is_admin());
create policy mr_ins on public.merchant_registrations for insert with check (public.is_admin() or (select auth.uid()) is not null);
create policy mr_upd on public.merchant_registrations for update using (public.is_admin()) with check (public.is_admin());
create policy mr_del on public.merchant_registrations for delete using (public.is_admin());
alter table public.merchant_registrations enable row level security;
revoke all on public.merchant_registrations from anon; grant select, insert, update, delete on public.merchant_registrations to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='partner_inquiries' loop
    execute format('drop policy if exists %I on public.partner_inquiries', pol.policyname); end loop;
end $$;
create policy pi_ins on public.partner_inquiries for insert with check (true);
create policy pi_sel on public.partner_inquiries for select using (public.is_admin());
create policy pi_upd on public.partner_inquiries for update using (public.is_admin()) with check (public.is_admin());
create policy pi_del on public.partner_inquiries for delete using (public.is_admin());
alter table public.partner_inquiries enable row level security;
grant insert on public.partner_inquiries to anon; revoke select, update, delete on public.partner_inquiries from anon;
grant select, insert, update, delete on public.partner_inquiries to authenticated;

-- ===== Group 6 + admin-only internal =====
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='user_cart' loop
    execute format('drop policy if exists %I on public.user_cart', pol.policyname); end loop;
end $$;
create policy uc_all on public.user_cart for all using ((user_id = (select auth.uid())) or public.is_admin()) with check ((user_id = (select auth.uid())) or public.is_admin());
alter table public.user_cart enable row level security;
revoke all on public.user_cart from anon; grant select, insert, update, delete on public.user_cart to authenticated;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='order_status_history' loop
    execute format('drop policy if exists %I on public.order_status_history', pol.policyname); end loop;
end $$;
create policy osh_sel on public.order_status_history for select using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_status_history.order_id and o.user_id = (select auth.uid())));
create policy osh_ins on public.order_status_history for insert with check (public.is_admin());
create policy osh_upd on public.order_status_history for update using (public.is_admin()) with check (public.is_admin());
create policy osh_del on public.order_status_history for delete using (public.is_admin());
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon; grant select, insert, update, delete on public.order_status_history to authenticated;

do $$ declare t text; pol record; begin
  foreach t in array array['guide_comments','guide_likes','guide_views'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for select using (true)', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check ((select auth.uid()) is not null)', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t||'_del', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

do $$ declare t text; pol record; begin
  foreach t in array array['admin_audit_log','kb_ai_processing_jobs','kb_documents','knowledge_base','merchant_codes','partnership_renewal_history'] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t||'_admin', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='conversations' loop
    execute format('drop policy if exists %I on public.conversations', pol.policyname); end loop;
end $$;
create policy conv_ins on public.conversations for insert with check (true);
create policy conv_sel on public.conversations for select using (public.is_admin());
create policy conv_upd on public.conversations for update using (public.is_admin()) with check (public.is_admin());
create policy conv_del on public.conversations for delete using (public.is_admin());
alter table public.conversations enable row level security;
grant insert on public.conversations to anon; revoke select, update, delete on public.conversations from anon;
grant select, insert, update, delete on public.conversations to authenticated;

-- ===== Stage 3: revoke anon on privileged RPCs + harden views =====
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'admin\_%'
  loop execute format('revoke execute on function %s from anon, public', r.sig); end loop;
  for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('chatbot_lookup_customer','get_customer_points_balance','get_customer_lifetime_points','get_customer_points_redeemed')
  loop execute format('revoke execute on function %s from anon', r.sig); end loop;
end $$;
revoke select on public.user_profiles from anon, authenticated;
do $$ declare v text; begin
  foreach v in array array['admin_list','admin_orders_enhanced','customer_list','customer_tier_status','pending_returns','component_library_with_usage'] loop
    begin execute format('alter view public.%I set (security_invoker = true)', v); execute format('revoke select on public.%I from anon', v); execute format('grant select on public.%I to authenticated', v);
    exception when others then null; end;
  end loop;
end $$;
