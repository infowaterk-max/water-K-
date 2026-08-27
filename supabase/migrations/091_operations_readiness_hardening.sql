-- V12 final hardening: reservation-less refund recovery and operational exception intelligence.

create or replace function public.restore_refunded_pre_fulfillment_inventory()
returns integer language plpgsql security definer set search_path=''
as $$
declare r record;v_prev integer;v_restore integer;v_units integer:=0;begin
 for r in
   select o.id as order_id,o.order_number,oi.variant_id,oi.sku,oi.quantity,
          coalesce((select sum(ie.change_quantity) from public.inventory_events ie where ie.order_id=o.id and ie.variant_id=oi.variant_id),0)::integer as net_inventory_change,
          coalesce(op.operational_status,'awaiting_reservation') as operational_status
   from public.orders o
   join public.order_items oi on oi.order_id=o.id and oi.variant_id is not null
   left join public.order_operations op on op.order_id=o.id
   where o.status='refunded'
     and coalesce(op.operational_status,'awaiting_reservation') not in ('handed_over','delivered')
     and not exists(select 1 from public.return_cases rc where rc.order_id=o.id and rc.inventory_restocked_at is not null)
   order by o.id,oi.variant_id,oi.id
 loop
   -- Net negative inventory events mean checkout stock has not yet been balanced by cancel/restock/release.
   v_restore:=least(r.quantity,greatest(-r.net_inventory_change,0));
   if v_restore<=0 then continue; end if;
   perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||r.variant_id::text,0));
   select stock_quantity into v_prev from public.product_variants where id=r.variant_id for update;
   if not found then continue; end if;
   update public.product_variants set stock_quantity=stock_quantity+v_restore,updated_at=now() where id=r.variant_id;
   insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
   values(r.variant_id,r.order_id,v_restore,v_prev,v_prev+v_restore,'refund_pre_fulfillment_release',null,jsonb_build_object('sku',r.sku,'order_number',r.order_number,'net_change_before',r.net_inventory_change,'reservation_independent',true));
   update public.inventory_reservations set status='released',released_at=coalesce(released_at,now()),reason='Teljes visszatérítés fulfillment előtt',updated_at=now(),metadata=metadata||jsonb_build_object('refund_stock_restored',true,'refund_stock_restored_at',now()) where order_id=r.order_id and variant_id=r.variant_id and status in ('active','consumed');
   update public.order_operations set operational_status='cancelled',exception_code=null,updated_at=now(),metadata=metadata||jsonb_build_object('closed_by_full_refund',true) where order_id=r.order_id and operational_status not in ('handed_over','delivered');
   v_units:=v_units+v_restore;
 end loop;
 return v_units;
end;$$;
revoke all on function public.restore_refunded_pre_fulfillment_inventory() from public,anon,authenticated;
grant execute on function public.restore_refunded_pre_fulfillment_inventory() to service_role;

create or replace view public.operations_exception_queue with(security_invoker=true) as
select so.*,
 case
   when so.operational_status in ('ready_to_pack','packed') and so.commerce_status not in ('paid','processing') then 'payment_fulfillment_mismatch'
   when so.operational_status='handed_over' and so.commerce_status<>'shipped' then 'shipment_status_mismatch'
   when so.operational_status='delivered' and so.commerce_status<>'completed' then 'delivery_status_mismatch'
   when so.exception_code is not null then so.exception_code
   when so.age_hours>=48 then 'sla_over_48h'
   when so.urgent_support_count>0 then 'urgent_support'
   when so.open_return_count>0 then 'open_return'
   else null
 end as derived_exception_code
from public.order_service_operations so
where so.exception_code is not null
   or so.age_hours>=24
   or so.service_attention_required
   or (so.operational_status in ('ready_to_pack','packed') and so.commerce_status not in ('paid','processing'))
   or (so.operational_status='handed_over' and so.commerce_status<>'shipped')
   or (so.operational_status='delivered' and so.commerce_status<>'completed');
revoke all on public.operations_exception_queue from public,anon,authenticated;
grant select on public.operations_exception_queue to service_role;

create or replace view public.inventory_pressure with(security_invoker=true) as
select a.*,
 case when a.available_to_promise_quantity=0 then 'critical'
      when a.available_to_promise_quantity<=greatest(2,ceil(a.on_hand_quantity*0.20)::integer) then 'low'
      else 'healthy' end as pressure_level,
 case when a.on_hand_quantity>0 then round((a.reserved_quantity::numeric/a.on_hand_quantity::numeric)*100,1) else 0 end as reservation_pressure_percent
from public.inventory_available_to_promise a;
revoke all on public.inventory_pressure from public,anon,authenticated;
grant select on public.inventory_pressure to service_role;

create or replace function public.process_operations_cycle(p_run_key text)
returns public.operations_processing_runs language plpgsql security definer set search_path=''
as $$
declare v public.operations_processing_runs;v_reconciled jsonb;v_priorities integer;v_refund_units integer;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('operations-cycle:'||p_run_key,0));
 select * into v from public.operations_processing_runs where run_key=p_run_key;
 if found and v.completed_at is not null then return v; end if;
 if not found then insert into public.operations_processing_runs(run_key) values(p_run_key) returning * into v; end if;
 select public.restore_refunded_pre_fulfillment_inventory() into v_refund_units;
 select public.reconcile_inventory_reservations() into v_reconciled;
 select public.refresh_order_operation_priorities() into v_priorities;
 update public.operations_processing_runs set reconciled=v_reconciled||jsonb_build_object('reservation_independent_refund_restored_units',v_refund_units),priorities_refreshed=v_priorities,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('restore_refunded_pre_fulfillment','reconcile_inventory','refresh_priorities')) where id=v.id returning * into v;
 return v;
end;$$;
revoke all on function public.process_operations_cycle(text) from public,anon,authenticated;
grant execute on function public.process_operations_cycle(text) to service_role;
