-- Returns "quick wins" modelled on Shopee MY:
--   * reason-driven resolution type + return-shipping liability
--   * evidence photos/videos bucket (public, unguessable filenames)
-- (The 14-day window, expanded reason taxonomy, evidence requirement and the
--  per-customer open-returns cap are enforced in the app via src/hooks/useReturns.ts;
--  returns.reason / refund_method are free text so no enum change is needed.)

alter table public.returns add column if not exists resolution_type text;         -- REFUND_ONLY | RETURN_REFUND | EXCHANGE
alter table public.returns add column if not exists return_shipping_paid_by text;  -- VENDOR | CUSTOMER

insert into storage.buckets (id, name, public) values ('return-evidence', 'return-evidence', true)
on conflict (id) do nothing;

drop policy if exists "Authed upload return evidence" on storage.objects;
create policy "Authed upload return evidence" on storage.objects
  for insert to authenticated with check (bucket_id = 'return-evidence');

drop policy if exists "Public read return evidence" on storage.objects;
create policy "Public read return evidence" on storage.objects
  for select using (bucket_id = 'return-evidence');
