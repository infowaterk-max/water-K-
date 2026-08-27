-- V12 audit hardening: aggregate stock preflight, persistent blocked states, strict event-key ownership
create or replace function public.reserve_inventory_for_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_order_status public.order_status;
  v_created integer:=0;
  v_existing integer:=0;
  v_need record;
  v_item record;
  v_available integer;
  v_rowcount integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
  select status into v_order_status from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order_status in ('cancelled','refunded') then raise exception 'order_not_reservable'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'order_has_no_items'; end if;
  if exists(select 1 from public.order_items where order_id=p_order_id and variant_id is null) then raise exception 'order_item_variant_missing'; end if;

  insert into public.order_operations(order_id) values(p_order_id) on conflict(order_id) do nothing;

  -- Preflight by variant, not by line item, so two lines for the same SKU cannot oversubscribe stock.
  for v_need in
    select oi.variant_id,sum(oi.quantity)::integer as required_quantity
    from public.order_items oi
    where oi.order_id=p_order_id
      and not exists(select 1 from public.inventory_reservations r where r.order_item_id=oi.id and r.status in ('active','consumed'))
    group by oi.variant_id
    order by oi.variant_id
  loop
    perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||v_need.variant_id::text,0));
    select (v.stock_quantity-coalesce((select sum(r.quantity) from public.inventory_reservations r where r.variant_id=v.id and r.status='active'),0))::integer
      into v_available
      from public.product_variants v where v.id=v_need.variant_id for update;
    if v_available is null then raise exception 'variant_not_found'; end if;
    if v_available<v_need.required_quantity then
      update public.order_operations
         set operational_status='blocked',exception_code='insufficient_stock',blocked_at=coalesce(blocked_at,now()),updated_at=now(),
             metadata=metadata||jsonb_build_object('failed_variant_id',v_need.variant_id,'required_quantity',v_need.required_quantity,'available_quantity',greatest(v_available,0))
       where order_id=p_order_id;
      insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,metadata)
      values('reservation-blocked:'||p_order_id::text||':'||v_need.variant_id::text,p_order_id,'blocked',null,'blocked',jsonb_build_object('reason','insufficient_stock','variant_id',v_need.variant_id,'required_quantity',v_need.required_quantity,'available_quantity',greatest(v_available,0)))
      on conflict(event_key) do update set metadata=excluded.metadata,occurred_at=now();
      return jsonb_build_object('order_id',p_order_id,'status','blocked','reason','insufficient_stock','variant_id',v_need.variant_id,'required_quantity',v_need.required_quantity,'available_quantity',greatest(v_available,0));
    end if;
  end loop;

  for v_item in select oi.id as order_item_id,oi.variant_id,oi.quantity from public.order_items oi where oi.order_id=p_order_id order by oi.variant_id,oi.id loop
    if exists(select 1 from public.inventory_reservations where order_item_id=v_item.order_item_id and status in ('active','consumed')) then
      v_existing:=v_existing+1;
      continue;
    end if;
    insert into public.inventory_reservations(reservation_key,order_id,order_item_id,variant_id,quantity,status,reason)
    values('order-item:'||v_item.order_item_id::text,p_order_id,v_item.order_item_id,v_item.variant_id,v_item.quantity,'active','Rendelési készletfoglalás')
    on conflict(order_item_id) do nothing;
    get diagnostics v_rowcount=row_count;
    v_created:=v_created+v_rowcount;
  end loop;

  update public.order_operations set operational_status='reserved',reservation_completed_at=coalesce(reservation_completed_at,now()),exception_code=null,blocked_at=null,updated_at=now() where order_id=p_order_id;
  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,metadata)
  values('reservation-complete:'||p_order_id::text,p_order_id,'reserved',null,'reserved',jsonb_build_object('created_reservations',v_created,'existing_reservations',v_existing))
  on conflict(event_key) do nothing;
  return jsonb_build_object('order_id',p_order_id,'created_reservations',v_created,'existing_reservations',v_existing,'status','reserved');
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
  v_need record;
  v_res record;
  v_stock integer;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ops-order:'||p_order_id::text,0));
  select * into op from public.order_operations where order_id=p_order_id for update;
  if not found then raise exception 'order_operations_not_initialized'; end if;

  v_event_type:=case p_target_status when 'ready_to_pack' then 'ready_to_pack' when 'packed' then 'packed' when 'handed_over' then 'handed_over' when 'delivered' then 'delivered' else null end;
  if v_event_type is null then raise exception 'unsupported_transition'; end if;

  select * into v_existing from public.fulfillment_events where event_key=p_event_key;
  if found then
    if v_existing.order_id<>p_order_id or v_existing.event_type<>v_event_type or coalesce(v_existing.to_status,'')<>p_target_status then raise exception 'event_key_conflict'; end if;
    return op;
  end if;

  v_from:=op.operational_status;
  if p_target_status='ready_to_pack' and v_from<>'reserved' then raise exception 'invalid_transition'; end if;
  if p_target_status='packed' and v_from<>'ready_to_pack' then raise exception 'invalid_transition'; end if;
  if p_target_status='handed_over' and v_from<>'packed' then raise exception 'invalid_transition'; end if;
  if p_target_status='delivered' and v_from<>'handed_over' then raise exception 'invalid_transition'; end if;

  if p_target_status='packed' then
    if not exists(select 1 from public.inventory_reservations where order_id=p_order_id and status='active') then raise exception 'no_consumable_reservations'; end if;
    -- Lock and preflight aggregate reservation demand before any physical decrement.
    for v_need in
      select variant_id,sum(quantity)::integer as required_quantity
      from public.inventory_reservations where order_id=p_order_id and status='active'
      group by variant_id order by variant_id
    loop
      perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||v_need.variant_id::text,0));
      select stock_quantity into v_stock from public.product_variants where id=v_need.variant_id for update;
      if v_stock is null then raise exception 'variant_not_found'; end if;
      if v_stock<v_need.required_quantity then
        update public.order_operations set operational_status='blocked',exception_code='physical_stock_below_reservation',blocked_at=coalesce(blocked_at,now()),updated_at=now(),metadata=metadata||jsonb_build_object('failed_variant_id',v_need.variant_id,'stock_quantity',v_stock,'reserved_quantity',v_need.required_quantity) where order_id=p_order_id returning * into op;
        insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata)
        values(p_event_key||':blocked',p_order_id,'blocked',v_from,'blocked',p_actor_id,jsonb_build_object('variant_id',v_need.variant_id,'stock_quantity',v_stock,'reserved_quantity',v_need.required_quantity))
        on conflict(event_key) do update set metadata=excluded.metadata,occurred_at=now();
        return op;
      end if;
    end loop;

    for v_res in select * from public.inventory_reservations where order_id=p_order_id and status='active' order by variant_id,id loop
      update public.product_variants set stock_quantity=stock_quantity-v_res.quantity where id=v_res.variant_id;
      update public.inventory_reservations set status='consumed',consumed_at=now(),updated_at=now() where id=v_res.id;
    end loop;
  end if;

  update public.order_operations set operational_status=p_target_status,
    ready_to_pack_at=case when p_target_status='ready_to_pack' then coalesce(ready_to_pack_at,now()) else ready_to_pack_at end,
    packed_at=case when p_target_status='packed' then coalesce(packed_at,now()) else packed_at end,
    handed_over_at=case when p_target_status='handed_over' then coalesce(handed_over_at,now()) else handed_over_at end,
    delivered_at=case when p_target_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
    exception_code=null,blocked_at=null,updated_at=now() where order_id=p_order_id returning * into op;
  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,p_order_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('source','v12_transition'));
  return op;
end;$$;
revoke all on function public.transition_order_operation(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_order_operation(uuid,text,text,uuid) to service_role;
