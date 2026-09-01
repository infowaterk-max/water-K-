-- Multi-tenant core scope, phase 2.
-- Additive migration: introduces store ownership to commerce data without yet removing legacy policies.
-- Strict NOT NULL / tenant RLS replacement follows only after all application write paths carry instance_id.

create or replace function public.single_runtime_instance_id() returns uuid
language sql stable security definer set search_path=public as $$
  select case when count(*)=1 then min(id) else null end
  from public.webshop_instances
  where status in ('pilot','active');
$$;

alter table public.products add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.product_variants add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.orders add column if not exists instance_id uuid references public.webshop_instances(id) on delete restrict;
alter table public.order_items add column if not exists instance_id uuid references public.webshop_instances(id) on delete restrict;
alter table public.inventory_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete restrict;
alter table public.inventory_reservations add column if not exists instance_id uuid references public.webshop_instances(id) on delete restrict;
alter table public.inventory_snapshots add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.marketing_campaigns add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.marketing_campaign_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.marketing_campaign_recipients add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.content_pages add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.coupons add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.product_recommendation_rules add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.product_reviews add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.wishlists add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.stock_notifications add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

-- Backfill legacy single-store installations. Multi-store legacy databases remain nullable for explicit repair.
update public.products set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.orders set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.marketing_campaigns set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.content_pages set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.coupons set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;

-- Derive child scopes from authoritative parent records.
update public.product_variants v set instance_id=p.instance_id from public.products p where v.product_id=p.id and v.instance_id is null and p.instance_id is not null;
update public.order_items i set instance_id=o.instance_id from public.orders o where i.order_id=o.id and i.instance_id is null and o.instance_id is not null;
update public.inventory_events e set instance_id=coalesce((select o.instance_id from public.orders o where o.id=e.order_id),(select v.instance_id from public.product_variants v where v.id=e.variant_id)) where e.instance_id is null;
update public.inventory_reservations r set instance_id=o.instance_id from public.orders o where r.order_id=o.id and r.instance_id is null and o.instance_id is not null;
update public.inventory_snapshots s set instance_id=v.instance_id from public.product_variants v where s.variant_id=v.id and s.instance_id is null and v.instance_id is not null;
update public.marketing_campaign_events e set instance_id=c.instance_id from public.marketing_campaigns c where e.campaign_id=c.id and e.instance_id is null and c.instance_id is not null;
update public.marketing_campaign_recipients r set instance_id=c.instance_id from public.marketing_campaigns c where r.campaign_id=c.id and r.instance_id is null and c.instance_id is not null;
update public.product_reviews r set instance_id=p.instance_id from public.products p where r.product_id=p.id and r.instance_id is null and p.instance_id is not null;
update public.product_recommendation_rules r set instance_id=v.instance_id from public.product_variants v where r.recommended_variant_id=v.id and r.instance_id is null and v.instance_id is not null;
update public.wishlists w set instance_id=v.instance_id from public.product_variants v where w.variant_id=v.id and w.instance_id is null and v.instance_id is not null;
update public.stock_notifications n set instance_id=v.instance_id from public.product_variants v where n.variant_id=v.id and n.instance_id is null and v.instance_id is not null;

create index if not exists products_instance_idx on public.products(instance_id);
create index if not exists product_variants_instance_idx on public.product_variants(instance_id);
create index if not exists orders_instance_created_idx on public.orders(instance_id,created_at desc);
create index if not exists order_items_instance_idx on public.order_items(instance_id,order_id);
create index if not exists inventory_events_instance_created_idx on public.inventory_events(instance_id,created_at desc);
create index if not exists inventory_reservations_instance_idx on public.inventory_reservations(instance_id,status);
create index if not exists inventory_snapshots_instance_date_idx on public.inventory_snapshots(instance_id,snapshot_date desc);
create index if not exists marketing_campaigns_instance_idx on public.marketing_campaigns(instance_id,created_at desc);
create index if not exists content_pages_instance_status_idx on public.content_pages(instance_id,status);
create index if not exists coupons_instance_active_idx on public.coupons(instance_id,active);
create index if not exists product_reviews_instance_idx on public.product_reviews(instance_id,product_id);
create index if not exists wishlists_instance_user_idx on public.wishlists(instance_id,user_id);
create index if not exists stock_notifications_instance_idx on public.stock_notifications(instance_id,status);

-- Tenant-consistency triggers automatically copy scope from parent rows and reject cross-store linkage.
create or replace function public.sync_product_variant_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.products where id=new.product_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store product variant is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;

drop trigger if exists product_variants_sync_instance on public.product_variants;
create trigger product_variants_sync_instance before insert or update of product_id,instance_id on public.product_variants for each row execute function public.sync_product_variant_instance();

create or replace function public.sync_order_item_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_instance uuid; variant_instance uuid;
begin
  select instance_id into parent_instance from public.orders where id=new.order_id;
  if new.variant_id is not null then select instance_id into variant_instance from public.product_variants where id=new.variant_id; end if;
  if parent_instance is not null and variant_instance is not null and parent_instance<>variant_instance then raise exception 'Cross-store order item is not allowed.'; end if;
  if new.instance_id is not null and parent_instance is not null and new.instance_id<>parent_instance then raise exception 'Order item store scope mismatch.'; end if;
  new.instance_id:=coalesce(parent_instance,new.instance_id);
  return new;
end $$;

drop trigger if exists order_items_sync_instance on public.order_items;
create trigger order_items_sync_instance before insert or update of order_id,variant_id,instance_id on public.order_items for each row execute function public.sync_order_item_instance();

create or replace function public.sync_variant_child_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.product_variants where id=new.variant_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store variant child is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;

drop trigger if exists inventory_snapshots_sync_instance on public.inventory_snapshots;
create trigger inventory_snapshots_sync_instance before insert or update of variant_id,instance_id on public.inventory_snapshots for each row execute function public.sync_variant_child_instance();
drop trigger if exists wishlists_sync_instance on public.wishlists;
create trigger wishlists_sync_instance before insert or update of variant_id,instance_id on public.wishlists for each row execute function public.sync_variant_child_instance();
drop trigger if exists stock_notifications_sync_instance on public.stock_notifications;
create trigger stock_notifications_sync_instance before insert or update of variant_id,instance_id on public.stock_notifications for each row execute function public.sync_variant_child_instance();

create or replace function public.sync_campaign_child_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.marketing_campaigns where id=new.campaign_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store campaign child is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;

drop trigger if exists marketing_campaign_events_sync_instance on public.marketing_campaign_events;
create trigger marketing_campaign_events_sync_instance before insert or update of campaign_id,instance_id on public.marketing_campaign_events for each row execute function public.sync_campaign_child_instance();
drop trigger if exists marketing_campaign_recipients_sync_instance on public.marketing_campaign_recipients;
create trigger marketing_campaign_recipients_sync_instance before insert or update of campaign_id,instance_id on public.marketing_campaign_recipients for each row execute function public.sync_campaign_child_instance();

create or replace function public.sync_inventory_event_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare variant_instance uuid; order_instance uuid;
begin
  select instance_id into variant_instance from public.product_variants where id=new.variant_id;
  if new.order_id is not null then select instance_id into order_instance from public.orders where id=new.order_id; end if;
  if variant_instance is not null and order_instance is not null and variant_instance<>order_instance then raise exception 'Cross-store inventory event is not allowed.'; end if;
  if new.instance_id is not null and coalesce(order_instance,variant_instance) is not null and new.instance_id<>coalesce(order_instance,variant_instance) then raise exception 'Inventory event store scope mismatch.'; end if;
  new.instance_id:=coalesce(order_instance,variant_instance,new.instance_id);
  return new;
end $$;

drop trigger if exists inventory_events_sync_instance on public.inventory_events;
create trigger inventory_events_sync_instance before insert or update of variant_id,order_id,instance_id on public.inventory_events for each row execute function public.sync_inventory_event_instance();

create or replace function public.sync_inventory_reservation_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare variant_instance uuid; order_instance uuid;
begin
  select instance_id into variant_instance from public.product_variants where id=new.variant_id;
  select instance_id into order_instance from public.orders where id=new.order_id;
  if variant_instance is not null and order_instance is not null and variant_instance<>order_instance then raise exception 'Cross-store inventory reservation is not allowed.'; end if;
  if new.instance_id is not null and order_instance is not null and new.instance_id<>order_instance then raise exception 'Inventory reservation store scope mismatch.'; end if;
  new.instance_id:=coalesce(order_instance,variant_instance,new.instance_id);
  return new;
end $$;

drop trigger if exists inventory_reservations_sync_instance on public.inventory_reservations;
create trigger inventory_reservations_sync_instance before insert or update of variant_id,order_id,instance_id on public.inventory_reservations for each row execute function public.sync_inventory_reservation_instance();

-- Diagnostics for the strict phase. A clean result has zero rows.
create or replace view public.tenant_scope_gaps as
select 'products'::text as table_name,count(*)::bigint as rows_without_instance from public.products where instance_id is null
union all select 'product_variants',count(*) from public.product_variants where instance_id is null
union all select 'orders',count(*) from public.orders where instance_id is null
union all select 'order_items',count(*) from public.order_items where instance_id is null
union all select 'inventory_events',count(*) from public.inventory_events where instance_id is null
union all select 'inventory_reservations',count(*) from public.inventory_reservations where instance_id is null
union all select 'inventory_snapshots',count(*) from public.inventory_snapshots where instance_id is null
union all select 'marketing_campaigns',count(*) from public.marketing_campaigns where instance_id is null
union all select 'content_pages',count(*) from public.content_pages where instance_id is null
union all select 'coupons',count(*) from public.coupons where instance_id is null;

comment on view public.tenant_scope_gaps is 'Architecture hardening diagnostic. Strict tenant RLS must not be enabled until every count is zero.';
