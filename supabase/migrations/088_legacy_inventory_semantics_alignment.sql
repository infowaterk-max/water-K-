-- V12 audit correction: checkout already decrements stock_quantity at order creation.
-- Reservations are therefore an operational/audit representation of committed stock,
-- not a second physical stock deduction.

create or replace view public.inventory_available_to_promise with(security_invoker=true) as
select v.id as variant_id,v.sku,v.label,
       (v.stock_quantity+coalesce(r.reserved_quantity,0))::integer as on_hand_quantity,
       coalesce(r.reserved_quantity,0)::integer as reserved_quantity,
       greatest(v.stock_quantity,0)::integer as available_to_promise_quantity,
       greatest(-v.stock_quantity,0)::integer as oversold_quantity
from public.product_variants v
left join lateral(
 select coalesce(sum(ir.quantity),0)::integer as reserved_quantity
 from public.inventory_reservations ir
 where ir.variant_id=v.id and ir.status='active'
) r on true;
revoke all on public.inventory_available_to_promise from public,anon,authenticated;
grant select on public.inventory_available_to_promise to service_role;

create or replace function public.reserve_inventory_for_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_order_status public.order_status;
  v_created integer:=0;
  v_existing integer:=0;
  v_item record;
  v_rowcount integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
  select status into v_order_status from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order_status in ('cancelled','refunded') then raise exception 'order_not_reservable'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'order_has_no_items'; end if;
  if exists(select 1 from public.order_items where order_id=p_order_id and variant_id is null) then raise exception 'order_item_variant_missing'; end if;

  insert into public.order_operations(order_id) values(p_order_id) on conflict(order_id) do nothing;

  for v_item in
    select oi.id as order_item_id,oi.variant_id,oi.quantity
    from public.order_items oi where oi.order_id=p_order_id order by oi.variant_id,oi.id
  loop
    perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||v_item.variant_id::text,0));
    if not exists(select 1 from public.product_variants where id=v_item.variant_id for update) then raise exception 'variant_not_found'; end if;
    if exists(select 1 from public.inventory_reservations where order_item_id=v_item.order_item_id and status in ('active','consumed')) then
      v_existing:=v_existing+1; continue;
    end if;
    insert into public.inventory_reservations(reservation_key,order_id,order_item_id,variant_id,quantity,status,reason,metadata)
    values('order-item:'||v_item.order_item_id::text,p_order_id,v_item.order_item_id,v_item.variant_id,v_item.quantity,
      case when v_order_status in ('shipped','completed') then 'consumed' else 'active' end,
      'Operációs foglalás; a készletet a checkout már levonta',
      jsonb_build_object('stock_semantics','checkout_decremented','commerce_status_at_creation',v_order_status))
    on conflict(order_item_id) do nothing;
    get diagnostics v_rowcount=row_count;
    v_created:=v_created+v_rowcount;
  end loop;

  update public.order_operations set
    operational_status=case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end,
    reservation_completed_at=coalesce(reservation_completed_at,now()),
    handed_over_at=case when v_order_status='shipped' then coalesce(handed_over_at,now()) else handed_over_at end,
    delivered_at=case when v_order_status='completed' then coalesce(delivered_at,now()) else delivered_at end,
    exception_code=null,blocked_at=null,updated_at=now(),
    metadata=metadata||jsonb_build_object('stock_semantics','checkout_decremented')
  where order_id=p_order_id;

  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,metadata)
  values('reservation-complete:'||p_order_id::text,p_order_id,'reserved',null,
    case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end,
    jsonb_build_object('created_reservations',v_created,'existing_reservations',v_existing,'stock_semantics','checkout_decremented'))
  on conflict(event_key) do nothing;

  return jsonb_build_object('order_id',p_order_id,'created_reservations',v_created,'existing_reservations',v_existing,'status',case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end);
end;$$;
revoke all on function public.reserve_inventory_for_order(uuid) from public,anon,authenticated;
grant execute on function public.reserve_inventory_for_order(uuid) to service_role;

create or replace function public.transition_order_operation(p_order_id uuid,p_target_status text,p_event_key text,p_actor_id uuid default null)
returns public.order_operations language plpgsql security definer set search_path=''
as $$
declare
  op public.order_operations;
  v_from text;
  v_event_type text;
  v_existing public.fulfillment_events;
  v_commerce public.order_status;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ops-order:'||p_order_id::text,0));
  select * into op from public.order_operations where order_id=p_order_id for update;
  if not found then raise exception 'order_operations_not_initialized'; end if;
  select status into v_commerce from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  v_event_type:=case p_target_status when 'ready_to_pack' then 'ready_to_pack' when 'packed' then 'packed' when 'handed_over' then 'handed_over' when 'delivered' then 'delivered' else null end;
  if v_event_type is null then raise exception 'unsupported_transition'; end if;
  select * into v_existing from public.fulfillment_events where event_key=p_event_key;
  if found then
    if v_existing.order_id<>p_order_id or v_existing.event_type<>v_event_type or coalesce(v_existing.to_status,'')<>p_target_status then raise exception 'event_key_conflict'; end if;
    return op;
  end if;

  v_from:=op.operational_status;
  if p_target_status='ready_to_pack' and (v_from<>'reserved' or v_commerce not in ('paid','processing')) then raise exception 'invalid_transition'; end if;
  if p_target_status='packed' and v_from<>'ready_to_pack' then raise exception 'invalid_transition'; end if;
  if p_target_status='handed_over' and v_from<>'packed' then raise exception 'invalid_transition'; end if;
  if p_target_status='delivered' and v_from<>'handed_over' then raise exception 'invalid_transition'; end if;

  if p_target_status='packed' then
    if not exists(select 1 from public.inventory_reservations where order_id=p_order_id and status='active') then raise exception 'no_active_reservations'; end if;
    update public.inventory_reservations set status='consumed',consumed_at=coalesce(consumed_at,now()),updated_at=now(),metadata=metadata||jsonb_build_object('consumed_at_operation','packed') where order_id=p_order_id and status='active';
  elsif p_target_status='handed_over' then
    update public.orders set status='shipped',updated_at=now() where id=p_order_id and status in ('paid','processing');
  elsif p_target_status='delivered' then
    update public.orders set status='completed',updated_at=now() where id=p_order_id and status='shipped';
  end if;

  update public.order_operations set operational_status=p_target_status,
    ready_to_pack_at=case when p_target_status='ready_to_pack' then coalesce(ready_to_pack_at,now()) else ready_to_pack_at end,
    packed_at=case when p_target_status='packed' then coalesce(packed_at,now()) else packed_at end,
    handed_over_at=case when p_target_status='handed_over' then coalesce(handed_over_at,now()) else handed_over_at end,
    delivered_at=case when p_target_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
    exception_code=null,blocked_at=null,updated_at=now(),metadata=metadata||jsonb_build_object('stock_semantics','checkout_decremented')
  where order_id=p_order_id returning * into op;
  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,p_order_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('source','v12_transition','stock_changed',false));
  return op;
end;$$;
revoke all on function public.transition_order_operation(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_order_operation(uuid,text,text,uuid) to service_role;

-- V12-aware cancellation restore: stock is restored only while the parcel has not been handed over.
create or replace function public.restore_cancelled_order_inventory()
returns trigger language plpgsql security definer set search_path=''
as $$
declare line record;previous_qty integer;v_op text;v_has_res boolean;begin
 if new.status='cancelled' and old.status is distinct from 'cancelled' then
   select operational_status into v_op from public.order_operations where order_id=new.id;
   if v_op in ('handed_over','delivered') then raise exception 'A futárnak átadott vagy kézbesített rendelés nem törölhető; használj visszáru/visszatérítés folyamatot.'; end if;
   select exists(select 1 from public.inventory_reservations where order_id=new.id) into v_has_res;
   if v_has_res then
     for line in select id,variant_id,quantity from public.inventory_reservations where order_id=new.id and status in ('active','consumed') order by variant_id,id loop
       perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||line.variant_id::text,0));
       select stock_quantity into previous_qty from public.product_variants where id=line.variant_id for update;
       if found then
         update public.product_variants set stock_quantity=stock_quantity+line.quantity,updated_at=now() where id=line.variant_id;
         insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
         values(line.variant_id,new.id,line.quantity,previous_qty,previous_qty+line.quantity,'order_cancelled',null,jsonb_build_object('v12_reservation_id',line.id,'order_number',new.order_number));
         update public.inventory_reservations set status='released',released_at=coalesce(released_at,now()),reason='Rendelés törölve, checkout készlet visszaállítva',updated_at=now() where id=line.id;
       end if;
     end loop;
   else
     -- Backward-compatible fallback for orders created before V12 reservations existed.
     for line in select oi.variant_id,oi.quantity,oi.sku from public.order_items oi where oi.order_id=new.id and oi.variant_id is not null loop
       select stock_quantity into previous_qty from public.product_variants where id=line.variant_id for update;
       if found then
         update public.product_variants set stock_quantity=stock_quantity+line.quantity,updated_at=now() where id=line.variant_id;
         insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
         values(line.variant_id,new.id,line.quantity,previous_qty,previous_qty+line.quantity,'order_cancelled',null,jsonb_build_object('sku',line.sku,'order_number',new.order_number,'legacy_fallback',true));
       end if;
     end loop;
   end if;
   if new.coupon_code is not null and length(trim(new.coupon_code))>0 then
     update public.coupons set usage_count=greatest(0,usage_count-1),updated_at=now() where code=upper(trim(new.coupon_code));
     insert into public.order_events(order_id,event_type,from_status,to_status,metadata) values(new.id,'coupon_released',old.status,new.status,jsonb_build_object('code',new.coupon_code));
   end if;
   update public.order_operations set operational_status='cancelled',exception_code=null,updated_at=now() where order_id=new.id;
   insert into public.order_events(order_id,event_type,from_status,to_status,metadata) values(new.id,'inventory_restored_on_cancel',old.status,new.status,jsonb_build_object('reason','order_cancelled','v12_aware',true));
 end if;
 return new;
end;$$;
revoke all on function public.restore_cancelled_order_inventory() from public,anon,authenticated;
