-- Phase 1, Stage 2 (group 2a): lock down financial tables owned by customer_id.
-- merchant_wallets, wallet_transactions, customer_subscription_payments become
-- owner-readable (the owning customer) + admin, admin-writable; anon fully
-- removed. Wallet mutations flow through SECURITY DEFINER RPCs that bypass RLS.
-- Verified: anon blocked, master reads all, customer sees only own. Applied remotely.

create or replace function public.current_customer_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.customer_profiles where user_id = (select auth.uid()) limit 1;
$$;

do $$
declare t text; pol record;
begin
  foreach t in array array['merchant_wallets','wallet_transactions','customer_subscription_payments']
  loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select using ((customer_id = public.current_customer_id()) or public.is_admin())', t||'_sel', t);
    execute format('create policy %I on public.%I for insert with check (public.is_admin())', t||'_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())', t||'_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t||'_del', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
