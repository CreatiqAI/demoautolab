-- Vendors could read their own order_items + fulfilments, but NOT the parent
-- `orders` row (RLS was owner + admin only). So the vendor order screen fell back
-- to a UUID slice for the order number and the literal "Customer" for the name,
-- and delivery/date fields were blank. Let a vendor read any order they fulfil.
--
-- SECURITY DEFINER helper avoids RLS recursion between orders <-> order_items.

create or replace function public.current_vendor_owns_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.order_items oi
    where oi.order_id = p_order_id
      and oi.vendor_id = public.current_vendor_id()
  );
$$;
grant execute on function public.current_vendor_owns_order(uuid) to authenticated;

drop policy if exists orders_vendor_sel on public.orders;
create policy orders_vendor_sel on public.orders for select
  using (public.current_vendor_owns_order(id));
