-- Extend tenant ownership to customer communication and recovery data.
-- Additive only; strict NOT NULL/RLS is activated in the final hardening migration.

alter table public.marketing_consents add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.communication_suppressions add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.communication_jobs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.checkout_recovery_intents add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

update public.marketing_consents set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.communication_suppressions set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.communication_jobs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.checkout_recovery_intents set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;

create index if not exists marketing_consents_instance_email_idx on public.marketing_consents(instance_id,lower(email),occurred_at desc);
create index if not exists communication_suppressions_instance_email_idx on public.communication_suppressions(instance_id,lower(email),active);
create index if not exists communication_jobs_instance_status_idx on public.communication_jobs(instance_id,status,scheduled_at);
create index if not exists checkout_recovery_instance_user_idx on public.checkout_recovery_intents(instance_id,user_id,status);

create or replace view public.tenant_scope_gaps as
select 'products'::text as table_name,count(*)::bigint as rows_without_instance from public.products where instance_id is null
union all select 'product_variants',count(*) from public.product_variants where instance_id is null
union all select 'orders',count(*) from public.orders where instance_id is null
union all select 'order_items',count(*) from public.order_items where instance_id is null
union all select 'inventory_events',count(*) from public.inventory_events where instance_id is null
union all select 'inventory_reservations',count(*) from public.inventory_reservations where instance_id is null
union all select 'inventory_snapshots',count(*) from public.inventory_snapshots where instance_id is null
union all select 'marketing_campaigns',count(*) from public.marketing_campaigns where instance_id is null
union all select 'marketing_campaign_recipients',count(*) from public.marketing_campaign_recipients where instance_id is null
union all select 'content_pages',count(*) from public.content_pages where instance_id is null
union all select 'coupons',count(*) from public.coupons where instance_id is null
union all select 'marketing_consents',count(*) from public.marketing_consents where instance_id is null
union all select 'communication_suppressions',count(*) from public.communication_suppressions where instance_id is null
union all select 'communication_jobs',count(*) from public.communication_jobs where instance_id is null
union all select 'checkout_recovery_intents',count(*) from public.checkout_recovery_intents where instance_id is null;
