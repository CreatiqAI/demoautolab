-- Comprehensive admin audit logging via database triggers.
--
-- Previously audit rows were only written by a fragile frontend helper called in
-- a handful of handlers — so most actions (product/component create/edit, add
-- stock, order approve/edit, refunds) were never logged. These triggers log EVERY
-- admin write on the core tables automatically, attributed to the acting admin,
-- and can't be bypassed from the UI. Non-admin (customer/system) writes are
-- skipped via is_admin(), so normal checkout etc. does not spam the log.

create or replace function public.audit_admin_write() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entity   text := tg_argv[0];
  v_username text;
  v_admin_id uuid;
  v_action   text;
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_id  uuid;
  v_label text;
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;

  v_username := lower(coalesce(auth.jwt() ->> 'email', ''));
  select ap.id into v_admin_id from public.admin_profiles ap
    where lower(ap.username) = v_username limit 1;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_action := v_entity || '.create';
  elsif tg_op = 'UPDATE' then
    v_new := to_jsonb(new); v_old := to_jsonb(old); v_action := v_entity || '.update';
  else
    v_old := to_jsonb(old); v_action := v_entity || '.delete';
  end if;

  v_row := coalesce(v_new, v_old);
  begin v_id := (v_row ->> 'id')::uuid; exception when others then v_id := null; end;

  v_label := coalesce(
    v_row ->> 'name', v_row ->> 'order_no', v_row ->> 'order_number',
    v_row ->> 'component_sku', v_row ->> 'business_name', v_row ->> 'title', v_row ->> 'sku'
  );

  insert into public.admin_audit_log
    (actor_admin_id, actor_username, action, entity_type, entity_id, entity_label, before_data, after_data)
  values (v_admin_id, nullif(v_username,''), v_action, v_entity, v_id, v_label, v_old, v_new);

  return coalesce(new, old);
exception when others then
  return coalesce(new, old); -- audit must never break the underlying action
end;
$$;

drop trigger if exists trg_audit on public.products_new;
create trigger trg_audit after insert or update or delete on public.products_new
  for each row execute function public.audit_admin_write('product');

drop trigger if exists trg_audit on public.component_library;
create trigger trg_audit after insert or update or delete on public.component_library
  for each row execute function public.audit_admin_write('component');

drop trigger if exists trg_audit on public.stock_movements;
create trigger trg_audit after insert or update or delete on public.stock_movements
  for each row execute function public.audit_admin_write('stock');

drop trigger if exists trg_audit on public.orders;
create trigger trg_audit after insert or update or delete on public.orders
  for each row execute function public.audit_admin_write('order');

drop trigger if exists trg_audit on public.order_items;
create trigger trg_audit after insert or update or delete on public.order_items
  for each row execute function public.audit_admin_write('order_item');

drop trigger if exists trg_audit on public.returns;
create trigger trg_audit after insert or update or delete on public.returns
  for each row execute function public.audit_admin_write('return');
