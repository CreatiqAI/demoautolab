-- Expand admin audit logging to EVERY public table (was 6 core tables).
-- audit_admin_write() now derives the entity name from the table itself (friendly
-- names for the common ones), and is attached to every base table except
-- admin_audit_log (which would recurse). The is_admin() guard means only admin
-- writes are recorded — customer/vendor/system writes are skipped, so hot tables
-- (cart, checkout, etc.) don't spam the log.

create or replace function public.audit_admin_write() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entity   text;
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

  v_entity := case tg_table_name
    when 'products_new' then 'product'
    when 'component_library' then 'component'
    when 'stock_movements' then 'stock'
    when 'orders' then 'order'
    when 'order_items' then 'order_item'
    when 'returns' then 'return'
    when 'return_items' then 'return_item'
    when 'premium_partnerships' then 'merchant'
    when 'vendors' then 'vendor'
    when 'vendor_payouts' then 'vendor_payout'
    when 'vendor_fulfilments' then 'vendor_fulfilment'
    when 'customer_profiles' then 'customer'
    when 'vouchers' then 'voucher'
    when 'categories' then 'category'
    when 'admin_profiles' then 'admin'
    else tg_table_name
  end;

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
    v_row ->> 'name', v_row ->> 'order_no', v_row ->> 'order_number', v_row ->> 'full_name',
    v_row ->> 'component_sku', v_row ->> 'business_name', v_row ->> 'company_name',
    v_row ->> 'title', v_row ->> 'code', v_row ->> 'sku', v_row ->> 'username'
  );

  insert into public.admin_audit_log
    (actor_admin_id, actor_username, action, entity_type, entity_id, entity_label, before_data, after_data)
  values (v_admin_id, nullif(v_username,''), v_action, v_entity, v_id, v_label, v_old, v_new);

  return coalesce(new, old);
exception when others then
  return coalesce(new, old);
end;
$$;

-- Attach to every public base table except the audit log itself.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind = 'r' and c.relname <> 'admin_audit_log'
  loop
    execute format('drop trigger if exists trg_audit on public.%I', r.relname);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_admin_write()', r.relname);
  end loop;
end $$;
