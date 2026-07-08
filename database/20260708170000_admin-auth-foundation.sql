-- Phase 1, Stage 0 — real admin authorization foundation.
-- is_admin()/is_master_admin() read the admin role from the JWT app_metadata,
-- which is populated once admins are real Supabase Auth users (see below).
-- These are used by the Stage 2 RLS policies. Already applied to the remote DB.

create or replace function public.is_admin()
returns boolean language sql stable
set search_path = public, pg_temp as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','admin','manager','staff'),
    false
  );
$$;

create or replace function public.is_master_admin()
returns boolean language sql stable
set search_path = public, pg_temp as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false);
$$;

-- The master admin (12voltsmy@gmail.com) was provisioned as a real auth.users
-- row with raw_app_meta_data.role = 'super_admin' and a matching auth.identities
-- row (email provider), so supabase.auth.signInWithPassword issues a JWT whose
-- app_metadata.role drives is_admin(). Done as a one-time data operation, not
-- repeated here. Remaining legacy admin (12341234) still uses the custom
-- admin_login RPC fallback until it is migrated (needs a password reset) — that
-- migration must happen BEFORE Stage 2 enables RLS enforcement.
