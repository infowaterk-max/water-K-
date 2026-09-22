-- Close remaining direct-client write surfaces for customer engagement data.
-- Customer writes now go through server-side actions that resolve and validate the current webshop.
-- Public approved review reads remain public by design.

update public.wishlists w
set instance_id=v.instance_id
from public.product_variants v
where w.variant_id=v.id
  and w.instance_id is null
  and v.instance_id is not null;

update public.product_reviews r
set instance_id=p.instance_id
from public.products p
where r.product_id=p.id
  and r.instance_id is null
  and p.instance_id is not null;

do $$
declare v_wishlist_gap bigint; v_review_gap bigint;
begin
  select count(*) into v_wishlist_gap from public.wishlists where instance_id is null;
  select count(*) into v_review_gap from public.product_reviews where instance_id is null;
  if v_wishlist_gap>0 then
    raise exception 'Engagement tenant closure blocked: wishlists contains % rows without instance_id',v_wishlist_gap;
  end if;
  if v_review_gap>0 then
    raise exception 'Engagement tenant closure blocked: product_reviews contains % rows without instance_id',v_review_gap;
  end if;
end $$;

alter table public.wishlists alter column instance_id set not null;
alter table public.product_reviews alter column instance_id set not null;

create or replace function public.sync_product_review_instance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_instance uuid;
begin
  select p.instance_id into v_instance
  from public.products p
  where p.id=new.product_id;

  if v_instance is null then
    raise exception 'Product review parent product has no webshop instance.';
  end if;
  if new.instance_id is not null and new.instance_id<>v_instance then
    raise exception 'Cross-store product review is not allowed.';
  end if;

  new.instance_id:=v_instance;
  return new;
end;
$$;

drop trigger if exists product_reviews_sync_instance on public.product_reviews;
create trigger product_reviews_sync_instance
before insert or update of product_id,instance_id on public.product_reviews
for each row execute function public.sync_product_review_instance();

revoke all on function public.sync_product_review_instance() from public,anon,authenticated;

-- Wishlist: customer session may only read its own rows.
drop policy if exists "users manage own wishlist" on public.wishlists;
drop policy if exists wishlists_owner_read on public.wishlists;
create policy wishlists_owner_read on public.wishlists
for select to authenticated
using ((select auth.uid())=user_id);

-- Stock notifications: direct inserts/updates/deletes are removed.
drop policy if exists "users read own stock notifications" on public.stock_notifications;
drop policy if exists "users create own stock notifications" on public.stock_notifications;
drop policy if exists "admins manage stock notifications" on public.stock_notifications;
drop policy if exists "admins update stock notifications" on public.stock_notifications;
drop policy if exists "admins delete stock notifications" on public.stock_notifications;
drop policy if exists "anonymous can create stock notifications" on public.stock_notifications;
drop policy if exists stock_notifications_owner_read on public.stock_notifications;
create policy stock_notifications_owner_read on public.stock_notifications
for select to authenticated
using (
  (select auth.uid())=user_id
  or public.can_manage_marketing(instance_id,(select auth.uid()))
);

-- Reviews: public approved reads stay public; authenticated users can read approved or own pending rows.
-- Moderation and review creation are service-side only, so customers cannot spoof verified_purchase.
drop policy if exists "authenticated reads approved or own reviews" on public.product_reviews;
drop policy if exists "users create own reviews" on public.product_reviews;
drop policy if exists "admins moderate reviews" on public.product_reviews;
drop policy if exists product_reviews_authenticated_read on public.product_reviews;
create policy product_reviews_authenticated_read on public.product_reviews
for select to authenticated
using (
  status='approved'
  or (select auth.uid())=user_id
  or public.can_manage_marketing(instance_id,(select auth.uid()))
);
