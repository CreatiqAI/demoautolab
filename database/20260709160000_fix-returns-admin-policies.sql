-- The returns / return_items / return_images "Admin full access" policies used a
-- broken check: `admin_profiles.id = auth.uid()`. admin_profiles.id is the profile
-- id, NOT the auth user id (they differ), so the check was always false and admins
-- could not view or process returns at all. Swap to the canonical is_admin() helper
-- (JWT app_metadata.role) used everywhere else. Owner (customer_id = auth.uid())
-- policies are unchanged.

drop policy "Admin full access returns" on public.returns;
create policy "Admin full access returns" on public.returns
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "Admin full access return items" on public.return_items;
create policy "Admin full access return items" on public.return_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "Admin full access return images" on public.return_images;
create policy "Admin full access return images" on public.return_images
  for all using (public.is_admin()) with check (public.is_admin());
