-- Consolidate overlapping permissive policies without changing access semantics.

-- CONTENT PAGES
-- Authenticated SELECT is already covered by the published-or-admin policy,
-- so split admin mutation access out of the previous ALL policy.
drop policy if exists "admins manage content" on public.content_pages;

create policy "admins insert content" on public.content_pages
  for insert to authenticated
  with check (private.is_admin());

create policy "admins update content" on public.content_pages
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins delete content" on public.content_pages
  for delete to authenticated
  using (private.is_admin());

-- STOCK NOTIFICATIONS
-- SELECT policy already grants admins visibility. Merge admin INSERT access into
-- the customer INSERT policy, and leave admin-only mutation policies separate.
drop policy if exists "admins manage stock notifications" on public.stock_notifications;

alter policy "users create own stock notifications" on public.stock_notifications
  with check (((select auth.uid()) = user_id) or private.is_admin());

create policy "admins update stock notifications" on public.stock_notifications
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins delete stock notifications" on public.stock_notifications
  for delete to authenticated
  using (private.is_admin());
