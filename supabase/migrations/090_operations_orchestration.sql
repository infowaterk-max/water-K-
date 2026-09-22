-- V12: refund-safe reservation reconciliation and idempotent operations cycle.

create table if not exists public.operations_processing_runs(
 id uuid primary key default gen_random_uuid(),
 run_key text not null unique,
 reconciled jsonb not null default '{}'::jsonb,
 priorities_refreshed integer not null default 0,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 metadata jsonb not null default '{}'::jsonb
);
alter table public.operations_processing_runs enable row level security;
revoke all on public.operations_processing_runs from anon,authenticated;
grant all on public.operations_processing_runs to service_role;

create or replace function public.reconcile_inventory_reservations()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_released integer:=0;v_reserved integer:=0;v_blocked integer:=0;v_refund_restored integer:=0;
 r record;rr record;v_result jsonb;v_prev integer;v_op text;
begin
 -- Cancelled orders are normally handled atomically by the cancellation trigger; clean up any leftovers only.
 update public.inventory_reservations ir set status='released',released_at=coalesce(released_at,now()),reason=coalesce(reason,'Rendelés törölve'),updated_at=now()
 from public.orders o where o.id=ir.order_id and o.status='cancelled' and ir.status='active';
 get diagnostics v_released=row_count;
 update public.order_operations op set operational_status='cancelled',exception_code=null,updated_at=now()
 from public.orders o where o.id=op.order_id and o.status='cancelled' and op.operational_status not in ('handed_over','delivered','cancelled');

 -- Fully refunded but not handed-over orders still contain checkout-reserved stock. Restore it exactly once.
 for r in
   select distinct o.id,o.order_number,coalesce(op.operational_status,'awaiting_reservation') as operational_status
   from public.orders o left join public.order_operations op on op.order_id=o.id
   where o.status='refunded' and coalesce(op.operational_status,'awaiting_reservation') not in ('handed_over','delivered','cancelled')
 loop
   v_op:=r.operational_status;
   for rr in select * from public.inventory_reservations where order_id=r.id and status in ('active','consumed') order by variant_id,id loop
     if coalesce((rr.metadata->>'refund_stock_restored')::boolean,false) then continue; end if;
     perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||rr.variant_id::text,0));
     select stock_quantity into v_prev from public.product_variants where id=rr.variant_id for update;
     if found then
       update public.product_variants set stock_quantity=stock_quantity+rr.quantity,updated_at=now() where id=rr.variant_id;
       insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
       values(rr.variant_id,r.id,rr.quantity,v_prev,v_prev+rr.quantity,'refund_pre_fulfillment_release',null,jsonb_build_object('reservation_id',rr.id,'order_number',r.order_number));
       update public.inventory_reservations set status='released',released_at=coalesce(released_at,now()),reason='Teljes visszatérítés fulfillment előtt',updated_at=now(),metadata=metadata||jsonb_build_object('refund_stock_restored',true,'refund_stock_restored_at',now()) where id=rr.id;
       v_refund_restored:=v_refund_restored+rr.quantity;
     end if;
   end loop;
   update public.order_operations set operational_status='cancelled',exception_code=null,updated_at=now(),metadata=metadata||jsonb_build_object('closed_by_full_refund',true) where order_id=r.id;
 end loop;

 -- Create/backfill operational reservations for orders whose checkout already committed stock.
 for r in
   select o.id from public.orders o left join public.order_operations op on op.order_id=o.id
   where o.status in ('pending','paid','processing','shipped','completed')
     and (op.order_id is null or not exists(select 1 from public.inventory_reservations ir where ir.order_id=o.id))
   order by o.created_at
 loop
   begin
     select public.reserve_inventory_for_order(r.id) into v_result;
     v_reserved:=v_reserved+coalesce((v_result->>'created_reservations')::integer,0);
   exception when others then
     v_blocked:=v_blocked+1;
     insert into public.order_operations(order_id,operational_status,exception_code,blocked_at,metadata)
       values(r.id,'blocked','reservation_reconciliation_failed',now(),jsonb_build_object('error',sqlerrm))
       on conflict(order_id) do update set operational_status='blocked',exception_code='reservation_reconciliation_failed',blocked_at=coalesce(public.order_operations.blocked_at,now()),updated_at=now(),metadata=public.order_operations.metadata||jsonb_build_object('last_reconciliation_error',sqlerrm);
   end;
 end loop;
 return jsonb_build_object('released_reservations',v_released,'created_reservations',v_reserved,'blocked_orders',v_blocked,'refund_restored_units',v_refund_restored);
end;$$;
revoke all on function public.reconcile_inventory_reservations() from public,anon,authenticated;
grant execute on function public.reconcile_inventory_reservations() to service_role;

create or replace function public.process_operations_cycle(p_run_key text)
returns public.operations_processing_runs language plpgsql security definer set search_path=''
as $$
declare v public.operations_processing_runs;v_reconciled jsonb;v_priorities integer;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('operations-cycle:'||p_run_key,0));
 select * into v from public.operations_processing_runs where run_key=p_run_key;
 if found and v.completed_at is not null then return v; end if;
 if not found then insert into public.operations_processing_runs(run_key) values(p_run_key) returning * into v; end if;
 select public.reconcile_inventory_reservations() into v_reconciled;
 select public.refresh_order_operation_priorities() into v_priorities;
 update public.operations_processing_runs set reconciled=v_reconciled,priorities_refreshed=v_priorities,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('reconcile_inventory','refresh_priorities')) where id=v.id returning * into v;
 return v;
end;$$;
revoke all on function public.process_operations_cycle(text) from public,anon,authenticated;
grant execute on function public.process_operations_cycle(text) to service_role;

create or replace function public.get_order_operation_snapshot(p_order_id uuid)
returns jsonb language sql security definer set search_path=''
as $$
 select jsonb_build_object(
   'operation',coalesce((select to_jsonb(op) from public.order_operations op where op.order_id=p_order_id),'{}'::jsonb),
   'reservations',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.inventory_reservations x where x.order_id=p_order_id),'[]'::jsonb),
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at desc) from (select id,event_key,event_type,from_status,to_status,occurred_at,metadata from public.fulfillment_events where order_id=p_order_id order by occurred_at desc limit 50)e),'[]'::jsonb),
   'returns',coalesce((select jsonb_agg(to_jsonb(rc) order by rc.requested_at desc) from (select id,status,refund_amount_gross_huf,requested_at,received_at,refunded_at,inventory_restocked_at from public.return_cases where order_id=p_order_id order by requested_at desc)rc),'[]'::jsonb),
   'support',coalesce((select jsonb_agg(to_jsonb(st) order by st.created_at desc) from (select id,ticket_number,status,priority,category,created_at from public.support_tickets where order_id=p_order_id order by created_at desc)st),'[]'::jsonb)
 );
$$;
revoke all on function public.get_order_operation_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.get_order_operation_snapshot(uuid) to service_role;
