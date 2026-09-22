-- Strict tenant isolation for the commerce core.
-- This migration intentionally aborts if any scoped legacy row is still unassigned.
-- It is applied only after the application write paths use instance_id consistently.

do $$
declare gap record;
begin
  for gap in select table_name,rows_without_instance from public.tenant_scope_gaps where rows_without_instance>0 loop
    raise exception 'Tenant hardening blocked: % contains % rows without instance_id',gap.table_name,gap.rows_without_instance;
  end loop;
end $$;

alter table public.products alter column instance_id set not null;
alter table public.product_variants alter column instance_id set not null;
alter table public.orders alter column instance_id set not null;
alter table public.order_items alter column instance_id set not null;
alter table public.inventory_events alter column instance_id set not null;
alter table public.inventory_reservations alter column instance_id set not null;
alter table public.inventory_snapshots alter column instance_id set not null;
alter table public.marketing_campaigns alter column instance_id set not null;
alter table public.marketing_campaign_events alter column instance_id set not null;
alter table public.marketing_campaign_recipients alter column instance_id set not null;
alter table public.content_pages alter column instance_id set not null;
alter table public.coupons alter column instance_id set not null;
alter table public.marketing_consents alter column instance_id set not null;
alter table public.communication_suppressions alter column instance_id set not null;
alter table public.communication_jobs alter column instance_id set not null;
alter table public.checkout_recovery_intents alter column instance_id set not null;

-- Previously global business identifiers become unique inside a webshop, not across the whole platform.
alter table public.products drop constraint if exists products_slug_key;
alter table public.product_variants drop constraint if exists product_variants_sku_key;
alter table public.content_pages drop constraint if exists content_pages_slug_key;
alter table public.coupons drop constraint if exists coupons_code_key;
create unique index if not exists products_instance_slug_unique on public.products(instance_id,slug);
create unique index if not exists product_variants_instance_sku_unique on public.product_variants(instance_id,sku);
create unique index if not exists content_pages_instance_slug_unique on public.content_pages(instance_id,slug);
create unique index if not exists coupons_instance_code_unique on public.coupons(instance_id,code);

-- Replace any legacy global UTM uniqueness with store-local attribution uniqueness.
drop index if exists public.marketing_campaigns_utm_campaign_unique;
drop index if exists public.marketing_campaigns_utm_campaign_lower_unique;
drop index if exists public.marketing_campaigns_utm_campaign_ci_unique;
create unique index if not exists marketing_campaigns_instance_utm_unique
  on public.marketing_campaigns(instance_id,lower(utm_campaign)) where utm_campaign is not null;

-- Tenant-aware access helpers. Platform operators remain an explicit platform-level bypass.
create or replace function public.can_read_store(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(
    p_instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],p_user_id
  );
$$;
create or replace function public.can_manage_catalog(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);
$$;
create or replace function public.can_manage_orders(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager','support'],p_user_id);
$$;
create or replace function public.can_manage_marketing(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);
$$;

-- Remove legacy policies from tables covered by the strict tenant model.
do $$
declare p record;
begin
  for p in
    select tablename,policyname from pg_policies
    where schemaname='public' and tablename=any(array[
      'products','product_variants','orders','order_items','inventory_events','inventory_reservations','inventory_snapshots',
      'marketing_campaigns','marketing_campaign_events','marketing_campaign_recipients','content_pages','coupons',
      'marketing_consents','communication_suppressions','communication_jobs','checkout_recovery_intents'
    ])
  loop
    execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_events enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_events enable row level security;
alter table public.marketing_campaign_recipients enable row level security;
alter table public.content_pages enable row level security;
alter table public.coupons enable row level security;
alter table public.marketing_consents enable row level security;
alter table public.communication_suppressions enable row level security;
alter table public.communication_jobs enable row level security;
alter table public.checkout_recovery_intents enable row level security;

-- Catalogue/content storefront reads are intentionally server-side through the service client.
-- Direct table access is reserved for authorized Workbench users.
create policy products_store_read on public.products for select to authenticated using (public.can_read_store(instance_id));
create policy products_store_write on public.products for all to authenticated using (public.can_manage_catalog(instance_id)) with check (public.can_manage_catalog(instance_id));
create policy variants_store_read on public.product_variants for select to authenticated using (public.can_read_store(instance_id));
create policy variants_store_write on public.product_variants for all to authenticated using (public.can_manage_catalog(instance_id)) with check (public.can_manage_catalog(instance_id));
create policy content_store_read on public.content_pages for select to authenticated using (public.can_read_store(instance_id));
create policy content_store_write on public.content_pages for all to authenticated using (public.can_manage_marketing(instance_id)) with check (public.can_manage_marketing(instance_id));
create policy coupons_store_all on public.coupons for all to authenticated using (public.can_manage_marketing(instance_id)) with check (public.can_manage_marketing(instance_id));

create policy orders_customer_or_store_read on public.orders for select to authenticated using (
  customer_id=auth.uid() or public.can_manage_orders(instance_id)
);
create policy orders_store_update on public.orders for update to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
create policy order_items_customer_or_store_read on public.order_items for select to authenticated using (
  public.can_manage_orders(instance_id) or exists(select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=auth.uid() and o.instance_id=order_items.instance_id)
);

create policy inventory_events_store_read on public.inventory_events for select to authenticated using (public.can_read_store(instance_id));
create policy inventory_events_store_write on public.inventory_events for all to authenticated using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id)) with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
create policy inventory_reservations_store_read on public.inventory_reservations for select to authenticated using (public.can_read_store(instance_id));
create policy inventory_reservations_store_write on public.inventory_reservations for all to authenticated using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id)) with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
create policy inventory_snapshots_store_read on public.inventory_snapshots for select to authenticated using (public.can_read_store(instance_id));

create policy campaigns_store_all on public.marketing_campaigns for all to authenticated using (public.can_manage_marketing(instance_id)) with check (public.can_manage_marketing(instance_id));
create policy campaign_events_store_all on public.marketing_campaign_events for all to authenticated using (public.can_manage_marketing(instance_id)) with check (public.can_manage_marketing(instance_id));
create policy campaign_recipients_store_all on public.marketing_campaign_recipients for all to authenticated using (public.can_manage_marketing(instance_id)) with check (public.can_manage_marketing(instance_id));
create policy marketing_consents_store_read on public.marketing_consents for select to authenticated using (public.can_manage_marketing(instance_id));
create policy suppressions_store_read on public.communication_suppressions for select to authenticated using (public.can_manage_marketing(instance_id));
create policy communication_jobs_store_read on public.communication_jobs for select to authenticated using (public.can_manage_marketing(instance_id) or public.can_manage_orders(instance_id));
create policy recovery_intents_owner_read on public.checkout_recovery_intents for select to authenticated using (user_id=auth.uid() or public.can_manage_marketing(instance_id));

-- Audit history is append-only to user sessions. Service-role application code owns inserts.
revoke update,delete on public.admin_audit_log from anon,authenticated;

comment on function public.can_read_store(uuid,uuid) is 'Tenant-aware RBAC helper used by strict commerce RLS.';
