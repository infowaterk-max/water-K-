-- V12 final inventory audit: aggregate refund recovery by order + variant.
create or replace function public.restore_refunded_pre_fulfillment_inventory()
returns integer language plpgsql security definer set search_path=''
as $$
declare r record;v_prev integer;v_restore integer;v_units integer:=0;begin
 for r in
   select o.id as order_id,o.order_number,oi.variant_id,max(oi.sku) as sku,sum(oi.quantity)::integer as ordered_quantity,
          coalesce((select sum(ie.change_quantity) from public.inventory_events ie where ie.order_id=o.id and ie.variant_id=oi.variant_id),0)::integer as net_inventory_change,
          coalesce(op.operational_status,'awaiting_reservation') as operational_status
   from public.orders o
   join public.order_items oi on oi.order_id=o.id and oi.variant_id is not null
   left join public.order_operations op on op.order_id=o.id
   where o.status='refunded'
     and coalesce(op.operational_status,'awaiting_reservation') not in ('handed_over','delivered')
     and not exists(select 1 from public.return_cases rc where rc.order_id=o.id and rc.inventory_restocked_at is not null)
   group by o.id,o.order_number,oi.variant_id,op.operational_status
   order by o.id,oi.variant_id
 loop
   v_restore:=least(r.ordered_quantity,greatest(-r.net_inventory_change,0));
   if v_restore<=0 then continue; end if;
   perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||r.variant_id::text,0));
   select stock_quantity into v_prev from public.product_variants where id=r.variant_id for update;
   if not found then continue; end if;
   update public.product_variants set stock_quantity=stock_quantity+v_restore,updated_at=now() where id=r.variant_id;
   insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
   values(r.variant_id,r.order_id,v_restore,v_prev,v_prev+v_restore,'refund_pre_fulfillment_release',null,jsonb_build_object('sku',r.sku,'order_number',r.order_number,'net_change_before',r.net_inventory_change,'ordered_quantity',r.ordered_quantity,'reservation_independent',true));
   update public.inventory_reservations set status='released',released_at=coalesce(released_at,now()),reason='Teljes visszatérítés fulfillment előtt',updated_at=now(),metadata=metadata||jsonb_build_object('refund_stock_restored',true,'refund_stock_restored_at',now()) where order_id=r.order_id and variant_id=r.variant_id and status in ('active','consumed');
   update public.order_operations set operational_status='cancelled',exception_code=null,updated_at=now(),metadata=metadata||jsonb_build_object('closed_by_full_refund',true) where order_id=r.order_id and operational_status not in ('handed_over','delivered');
   v_units:=v_units+v_restore;
 end loop;
 return v_units;
end;$$;
revoke all on function public.restore_refunded_pre_fulfillment_inventory() from public,anon,authenticated;
grant execute on function public.restore_refunded_pre_fulfillment_inventory() to service_role;
