-- Merchant registration rework: man_power column, TIN reuses tax_id (no schema change),
-- passwordless (phone-OTP) login routing, and approval -> WhatsApp notification via n8n.
-- Applied 2026-07-22.

-- 1. Man Power (stored as a range string, e.g. '6-10')
alter table public.merchant_registrations add column if not exists man_power text;

-- 2. Login routing: merchants AND passwordless (auth_method='phone_otp') accounts use OTP.
--    Adds a non-breaking 'login_method' field; existing fields unchanged. This lets a
--    PENDING merchant (customer_type still 'normal') log in via OTP and shop as B2C
--    before approval, then flip to merchant (B2B) pricing on approval.
create or replace function public.lookup_account_by_phone(p_phone text)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $$
declare v_type text; v_email text; v_user uuid; v_found boolean := false; v_auth_method text;
begin
  select cp.customer_type, cp.email, cp.user_id into v_type, v_email, v_user
  from public.customer_profiles cp where cp.phone = p_phone limit 1;
  if found then v_found := true; end if;
  if v_user is not null then
    select u.raw_user_meta_data->>'auth_method' into v_auth_method
    from auth.users u where u.id = v_user;
  end if;
  return jsonb_build_object(
    'exists', v_found,
    'account_type', case when not v_found then 'none'
                         when v_type = 'merchant' then 'merchant' else 'customer' end,
    'login_method', case when not v_found then null
                         when v_type = 'merchant' or v_auth_method = 'phone_otp' then 'otp'
                         else 'password' end,
    'email', v_email
  );
end;
$$;

-- 3. On approval, POST to the n8n order-notifications webhook (Supabase DB-webhook shape)
--    so it sends the "approved + RM50 voucher" WhatsApp to the registered phone.
--    The RM50 voucher itself is created by the separate welcome-voucher trigger.
create or replace function public.notify_merchant_approved()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $$
declare v_phone text; v_name text; v_voucher text; v_payload jsonb;
begin
  if new.status = 'APPROVED' and (old.status is null or old.status <> 'APPROVED') then
    select cp.phone, coalesce(nullif(cp.full_name,''), cp.username, new.company_name)
      into v_phone, v_name
    from public.customer_profiles cp where cp.id = new.customer_id;
    v_voucher := 'WELCOME-' || upper(substring(new.customer_id::text, 1, 8));
    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'merchant_registrations',
      'record', jsonb_build_object(
        'id', new.id,
        'customer_id', new.customer_id,
        'status', new.status,
        'company_name', new.company_name,
        'customer_name', v_name,
        'customer_phone', v_phone,
        'email', new.email,
        'voucher_code', v_voucher,
        'voucher_amount', 50
      ),
      'old_record', jsonb_build_object('status', old.status)
    );
    perform net.http_post(
      url := 'https://creatiqai.app.n8n.cloud/webhook/order-notifications',
      body := v_payload,
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  raise warning 'notify_merchant_approved failed for %: %', new.customer_id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists trigger_notify_merchant_approved on public.merchant_registrations;
create trigger trigger_notify_merchant_approved
  after update of status on public.merchant_registrations
  for each row execute function public.notify_merchant_approved();
