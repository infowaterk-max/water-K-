-- Strict tenant isolation for order-adjacent operational data.
-- Aborts instead of enabling RLS if any operational row is still unassigned.

do $$
declare gap record;
begin
  for gap in select table_name,rows_without_instance from public.tenant_operational_scope_gaps where rows_without_instance>0 loop
    raise exception 'Operational tenant hardening blocked: % contains % rows without instance_id',gap.table_name,gap.rows_without_instance;
  end loop;
end $$;

alter table public.payment_attempts alter column instance_id set not null;
alter table public.payment_events alter column instance_id set not null;
alter table public.fulfillment_events alter column instance_id set not null;
alter table public.integration_jobs alter column instance_id set not null;
alter table public.order_events alter column instance_id set not null;
alter table public.order_operations alter column instance_id set not null;
alter table public.purchase_orders alter column instance_id set not null;
alter table public.purchase_order_items alter column instance_id set not null;
alter table public.return_cases alter column instance_id set not null;
alter table public.return_case_items alter column instance_id set not null;
alter table public.support_tickets alter column instance_id set not null;
alter table public.support_ticket_messages alter column instance_id set not null;

-- Child rows must always inherit the same tenant as their parent object.
create or replace function public.enforce_order_tenant_match() returns trigger language plpgsql set search_path=public as $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.orders where id=new.order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store order relation is not allowed.'; end if;
  return new;
end $$;
create or replace function public.enforce_purchase_order_tenant_match() returns trigger language plpgsql set search_path=public as $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.purchase_orders where id=new.purchase_order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store purchase order relation is not allowed.'; end if;
  return new;
end $$;
create or replace function public.enforce_return_case_tenant_match() returns trigger language plpgsql set search_path=public as $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.return_cases where id=new.return_case_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store return relation is not allowed.'; end if;
  return new;
end $$;
create or replace function public.enforce_support_ticket_tenant_match() returns trigger language plpgsql set search_path=public as $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.support_tickets where id=new.ticket_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store support relation is not allowed.'; end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['payment_attempts','fulfillment_events','order_events','order_operations','return_cases'] loop
    execute format('drop trigger if exists %I on public.%I','tenant_order_match_'||t,t);
    execute format('create trigger %I before insert or update of order_id,instance_id on public.%I for each row execute function public.enforce_order_tenant_match()','tenant_order_match_'||t,t);
  end loop;
end $$;
drop trigger if exists tenant_order_match_payment_events on public.payment_events;
create trigger tenant_order_match_payment_events before insert or update of order_id,instance_id on public.payment_events for each row when (new.order_id is not null) execute function public.enforce_order_tenant_match();
drop trigger if exists tenant_order_match_integration_jobs on public.integration_jobs;
create trigger tenant_order_match_integration_jobs before insert or update of order_id,instance_id on public.integration_jobs for each row when (new.order_id is not null) execute function public.enforce_order_tenant_match();
drop trigger if exists tenant_order_match_support_tickets on public.support_tickets;
create trigger tenant_order_match_support_tickets before insert or update of order_id,instance_id on public.support_tickets for each row when (new.order_id is not null) execute function public.enforce_order_tenant_match();
drop trigger if exists tenant_purchase_match_items on public.purchase_order_items;
create trigger tenant_purchase_match_items before insert or update of purchase_order_id,instance_id on public.purchase_order_items for each row execute function public.enforce_purchase_order_tenant_match();
drop trigger if exists tenant_return_match_items on public.return_case_items;
create trigger tenant_return_match_items before insert or update of return_case_id,instance_id on public.return_case_items for each row execute function public.enforce_return_case_tenant_match();
drop trigger if exists tenant_support_match_messages on public.support_ticket_messages;
create trigger tenant_support_match_messages before insert or update of ticket_id,instance_id on public.support_ticket_messages for each row execute function public.enforce_support_ticket_tenant_match();

-- Replace legacy policies on operational tables.
do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and tablename=any(array['payment_attempts','payment_events','fulfillment_events','integration_jobs','order_events','order_operations','purchase_orders','purchase_order_items','return_cases','return_case_items','support_tickets','support_ticket_messages']) loop
    execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['payment_attempts','payment_events','fulfillment_events','integration_jobs','order_events','order_operations','purchase_orders','purchase_order_items','return_cases','return_case_items','support_tickets','support_ticket_messages'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy payment_attempts_store_read on public.payment_attempts for select to authenticated using (public.can_manage_orders(instance_id));
create policy payment_events_store_read on public.payment_events for select to authenticated using (public.can_manage_orders(instance_id));
create policy fulfillment_events_store_read on public.fulfillment_events for select to authenticated using (public.can_manage_orders(instance_id));
create policy integration_jobs_store_read on public.integration_jobs for select to authenticated using (public.can_read_store(instance_id));
create policy order_events_store_read on public.order_events for select to authenticated using (public.can_manage_orders(instance_id));
create policy order_operations_store_all on public.order_operations for all to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
create policy purchase_orders_store_all on public.purchase_orders for all to authenticated using (public.can_manage_catalog(instance_id)) with check (public.can_manage_catalog(instance_id));
create policy purchase_order_items_store_all on public.purchase_order_items for all to authenticated using (public.can_manage_catalog(instance_id)) with check (public.can_manage_catalog(instance_id));
create policy return_cases_store_all on public.return_cases for all to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
create policy return_case_items_store_all on public.return_case_items for all to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
create policy support_tickets_store_all on public.support_tickets for all to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
create policy support_ticket_messages_store_all on public.support_ticket_messages for all to authenticated using (public.can_manage_orders(instance_id)) with check (public.can_manage_orders(instance_id));
