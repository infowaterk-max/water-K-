-- Extend tenant ownership to order-adjacent operational domains.
-- Prepared after core checkout isolation; strict NOT NULL/RLS remains guarded by zero-gap checks.

alter table public.payment_attempts add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.payment_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.fulfillment_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.integration_jobs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.order_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.order_operations add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.purchase_orders add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.purchase_order_items add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.return_cases add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.return_case_items add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.support_tickets add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.support_ticket_messages add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

update public.payment_attempts x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.payment_events x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.fulfillment_events x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.integration_jobs x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.order_events x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.order_operations x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.return_cases x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;
update public.support_tickets x set instance_id=o.instance_id from public.orders o where x.order_id=o.id and x.instance_id is null;

-- Standalone operational rows can only be auto-assigned in a single-store runtime.
update public.integration_jobs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.purchase_orders set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.support_tickets set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.payment_events set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;

update public.purchase_order_items i set instance_id=p.instance_id from public.purchase_orders p where i.purchase_order_id=p.id and i.instance_id is null;
update public.return_case_items i set instance_id=r.instance_id from public.return_cases r where i.return_case_id=r.id and i.instance_id is null;
update public.support_ticket_messages m set instance_id=t.instance_id from public.support_tickets t where m.ticket_id=t.id and m.instance_id is null;

create index if not exists payment_attempts_instance_order_idx on public.payment_attempts(instance_id,order_id);
create index if not exists payment_events_instance_order_idx on public.payment_events(instance_id,order_id,created_at desc);
create index if not exists fulfillment_events_instance_order_idx on public.fulfillment_events(instance_id,order_id);
create index if not exists integration_jobs_instance_status_idx on public.integration_jobs(instance_id,status,next_attempt_at);
create index if not exists order_events_instance_order_idx on public.order_events(instance_id,order_id);
create index if not exists order_operations_instance_order_idx on public.order_operations(instance_id,order_id);
create index if not exists purchase_orders_instance_status_idx on public.purchase_orders(instance_id,status,created_at desc);
create index if not exists return_cases_instance_order_idx on public.return_cases(instance_id,order_id);
create index if not exists support_tickets_instance_status_idx on public.support_tickets(instance_id,status,updated_at desc);

create or replace view public.tenant_operational_scope_gaps as
select 'payment_attempts'::text table_name,count(*)::bigint rows_without_instance from public.payment_attempts where instance_id is null
union all select 'payment_events',count(*) from public.payment_events where instance_id is null
union all select 'fulfillment_events',count(*) from public.fulfillment_events where instance_id is null
union all select 'integration_jobs',count(*) from public.integration_jobs where instance_id is null
union all select 'order_events',count(*) from public.order_events where instance_id is null
union all select 'order_operations',count(*) from public.order_operations where instance_id is null
union all select 'purchase_orders',count(*) from public.purchase_orders where instance_id is null
union all select 'purchase_order_items',count(*) from public.purchase_order_items where instance_id is null
union all select 'return_cases',count(*) from public.return_cases where instance_id is null
union all select 'return_case_items',count(*) from public.return_case_items where instance_id is null
union all select 'support_tickets',count(*) from public.support_tickets where instance_id is null
union all select 'support_ticket_messages',count(*) from public.support_ticket_messages where instance_id is null;
