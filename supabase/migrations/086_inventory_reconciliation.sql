-- V12: reconcile reservations with commerce lifecycle without auto-restocking consumed stock
create or replace function public.reconcile_inventory_reservations()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_released integer:=0;v_reserved integer:=0;v_blocked integer:=0;r record;v_result jsonb;begin
  -- Release only still-active reservations for orders that can no longer be fulfilled.
  update public.inventory_reservations ir
     set status='released',released_at=coalesce(released_at,now()),reason='Automatikus release: rendelés törölt/visszatérített',updated_at=now()
    from public.orders o
   where o.id=ir.order_id and ir.status='active' and o.status in ('cancelled','refunded');
  get diagnostics v_released=row_count;

  update public.order_operations op
     set operational_status='cancelled',exception_code=null,updated_at=now()
    from public.orders o
   where o.id=op.order_id and o.status in ('cancelled','refunded') and op.operational_status not in ('delivered','cancelled');

  -- Never add consumed stock back automatically. Refund/return restocking needs a separate verified physical-return action.
  for r in
    select o.id
      from public.orders o
      left join public.order_operations op on op.order_id=o.id
     where o.status in ('paid','processing')
       and coalesce(op.operational_status,'awaiting_reservation') in ('awaiting_reservation','blocked')
     order by o.created_at
  loop
    begin
      select public.reserve_inventory_for_order(r.id) into v_result;
      v_reserved:=v_reserved+coalesce((v_result->>'created_reservations')::integer,0);
    exception when others then
      v_blocked:=v_blocked+1;
    end;
  end loop;

  return jsonb_build_object('released_active_reservations',v_released,'created_reservations',v_reserved,'blocked_orders',v_blocked);
end;$$;
revoke all on function public.reconcile_inventory_reservations() from public,anon,authenticated;
grant execute on function public.reconcile_inventory_reservations() to service_role;

create or replace view public.operations_inventory_summary with(security_invoker=true) as
select
  (select count(*) from public.order_operations_queue) as open_orders,
  (select count(*) from public.order_operations where operational_status='blocked') as blocked_orders,
  (select count(*) from public.order_operations where operational_status in ('reserved','ready_to_pack','packed')) as fulfillment_backlog,
  (select count(*) from public.inventory_available_to_promise where available_to_promise_quantity=0) as zero_atp_variants,
  (select coalesce(sum(reserved_quantity),0) from public.inventory_available_to_promise) as reserved_units,
  (select coalesce(sum(oversold_quantity),0) from public.inventory_available_to_promise) as oversold_units;
revoke all on public.operations_inventory_summary from public,anon,authenticated;
grant select on public.operations_inventory_summary to service_role;
