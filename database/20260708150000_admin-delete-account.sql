-- admin_delete_account: master-admin Staff deletion path.
-- Removes an admin_profiles row by id. Master (super_admin) accounts are
-- protected so the platform can never be left without a master.
-- NOTE: caller identity is enforced client-side only (super_admin gate in the
-- Staff Management UI) until the Phase 1 admin-auth rebuild introduces a real
-- server-side admin role. Already applied to the remote DB.

create or replace function public.admin_delete_account(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  select role into v_role from public.admin_profiles where id = p_id;
  if v_role is null then
    return json_build_object('success', false, 'message', 'Account not found');
  end if;
  if v_role = 'super_admin' then
    return json_build_object('success', false, 'message', 'Master admin accounts cannot be deleted here.');
  end if;
  delete from public.admin_profiles where id = p_id;
  return json_build_object('success', true, 'message', 'Admin account removed');
end;
$$;

grant execute on function public.admin_delete_account(uuid) to anon, authenticated;
