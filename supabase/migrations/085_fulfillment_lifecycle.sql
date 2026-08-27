-- V12: controlled fulfillment lifecycle and physical stock consumption
create table if not exists public.fulfillment_events(
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 order_id uuid not null references public.orders(id) on delete restrict,
 event_type text not null check(event_type in ('reserved','ready_to_pack','packed','stock_consumed','handed_over','delivered','released','blocked')),
 from_status text,
 to_status text,
 occurred_at timestamptz not null default now(),
 actor_id uuid references auth.users(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists fulfillment_events_order_idx on public.fulfillment_events(order_id,occurred_at desc);
alter table public.fulfillment_events enable row level security;
revoke all on public.fulfillment_events from anon,authenticated;
grant all on public.fulfillment_events to service_role;

create or replace function public.transition_order_operation(p_order_id uuid,p_target_status text,p_event_key text,p_actor_id uuid default null)
returns public.order_operations language plpgsql security definer set search_path=''
as $$
declare op public.order_operations;v_from text;v_event_type text;v_stock integer;v_res record;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ops-order:'||p_order_id::text,0));
 select * into op from public.order_operations where order_id=p_order_id for update;
 if not found then raise exception 'order_operations_not_initialized'; end if;
 if exists(select 1 from public.fulfillment_events where event_key=p_event_key) then return op; end if;
 v_from:=op.operational_status;
 if p_target_status='ready_to_pack' and v_from<>'reserved' then raise exception 'invalid_transition'; end if;
 if p_target_status='packed' and v_from<>'ready_to_pack' then raise exception 'invalid_transition'; end if;
 if p_target_status='handed_over' and v_from<>'packed' then raise exception 'invalid_transition'; end if;
 if p_target_status='delivered' and v_from<>'handed_over' then raise exception 'invalid_transition'; end if;
 if p_target_status not in ('ready_to_pack','packed','handed_over','delivered') then raise exception 'unsupported_transition'; end if;
 if p_target_status='packed' then
   for v_res in select * from public.inventory_reservations where order_id=p_order_id and status='active' order by variant_id,id loop
     perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||v_res.variant_id::text,0));
     select stock_quantity into v_stock from public.product_variants where id=v_res.variant_id for update;
     if v_stock<v_res.quantity then
       update public.order_operations set operational_status='blocked',exception_code='physical_stock_below_reservation',blocked_at=coalesce(blocked_at,now()),updated_at=now() where order_id=p_order_id returning * into op;
       insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key||':blocked',p_order_id,'blocked',v_from,'blocked',p_actor_id,jsonb_build_object('variant_id',v_res.variant_id,'stock_quantity',v_stock,'reserved_quantity',v_res.quantity)) on conflict(event_key) do nothing;
       raise exception 'physical_stock_below_reservation';
     end if;
     update public.product_variants set stock_quantity=stock_quantity-v_res.quantity where id=v_res.variant_id;
     update public.inventory_reservations set status='consumed',consumed_at=now(),updated_at=now() where id=v_res.id;
   end loop;
   if not exists(select 1 from public.inventory_reservations where order_id=p_order_id and status='consumed') then raise exception 'no_consumable_reservations'; end if;
 end if;
 v_event_type:=case p_target_status when 'ready_to_pack' then 'ready_to_pack' when 'packed' then 'packed' when 'handed_over' then 'handed_over' else 'delivered' end;
 update public.order_operations set operational_status=p_target_status,
   ready_to_pack_at=case when p_target_status='ready_to_pack' then coalesce(ready_to_pack_at,now()) else ready_to_pack_at end,
   packed_at=case when p_target_status='packed' then coalesce(packed_at,now()) else packed_at end,
   handed_over_at=case when p_target_status='handed_over' then coalesce(handed_over_at,now()) else handed_over_at end,
   delivered_at=case when p_target_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
   exception_code=null,updated_at=now() where order_id=p_order_id returning * into op;
 insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p_order_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('source','v12_transition'));
 return op;
end;$$;
revoke all on function public.transition_order_operation(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_order_operation(uuid,text,text,uuid) to service_role;

create or replace view public.fulfillment_sla_summary with(security_invoker=true) as
select
 count(*) filter(where operational_status='awaiting_reservation') as awaiting_reservation_count,
 count(*) filter(where operational_status='reserved') as reserved_count,
 count(*) filter(where operational_status='ready_to_pack') as ready_to_pack_count,
 count(*) filter(where operational_status='packed') as packed_count,
 count(*) filter(where operational_status='blocked') as blocked_count,
 coalesce(avg(age_hours) filter(where operational_status not in ('delivered','cancelled')),0) as avg_open_age_hours,
 count(*) filter(where age_hours>=24 and operational_status not in ('delivered','cancelled')) as over_24h_count
from public.order_operations_queue;
revoke all on public.fulfillment_sla_summary from public,anon,authenticated;
grant select on public.fulfillment_sla_summary to service_role;
