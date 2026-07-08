-- Phase 1, Stage 2 (group 1): lock down customer_profiles (all customer PII).
-- Replaces the redundant/broken legacy policies with clean owner + admin rules,
-- enables RLS, and removes anon access entirely. is_admin() reads the JWT role
-- (admins are real Supabase Auth users as of Stage 0). Verified: anon blocked,
-- customer sees only own row, master admin sees all. Already applied remotely.

drop policy if exists "Users can create own profile" on public.customer_profiles;
drop policy if exists "Admin users can view all customer profiles" on public.customer_profiles;
drop policy if exists "Users can view own customer profile" on public.customer_profiles;
drop policy if exists "Users can view own profile" on public.customer_profiles;
drop policy if exists "Users can update own customer profile" on public.customer_profiles;
drop policy if exists "Users can update own profile" on public.customer_profiles;

create policy cp_select on public.customer_profiles for select
  using ((user_id = (select auth.uid())) or public.is_admin());
create policy cp_insert on public.customer_profiles for insert
  with check ((user_id = (select auth.uid())) or public.is_admin());
create policy cp_update on public.customer_profiles for update
  using ((user_id = (select auth.uid())) or public.is_admin())
  with check ((user_id = (select auth.uid())) or public.is_admin());
create policy cp_delete on public.customer_profiles for delete
  using (public.is_admin());

alter table public.customer_profiles enable row level security;

revoke all on public.customer_profiles from anon;
grant select, insert, update, delete on public.customer_profiles to authenticated;
