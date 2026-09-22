-- Production pilot acceptance: fix enum/text mismatch in the core order lifecycle RPC.
-- The public API intentionally accepts text for PostgREST compatibility, but all
-- comparisons and writes must use a validated public.order_status value.

create or replace function public.transition_tenant_order_v1(
  p_instance_id uuid,
  p_order_id uuid,
  p_actor uuid,
  p_target_status text,
  p_tracking_number text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_target_status public.order_status;
  v_allowed boolean:=false;
  v_restore boolean:=false;
  v_line record;
  v_already integer;
  v_remaining integer;
  v_result jsonb;
begin
  begin
    v_target_status:=p_target_status::public.order_status;
  exception when invalid_text_representation then
    raise exception 'Érvénytelen rendelési állapot: %',p_target_status;
  end;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then
    raise exception 'A rendelés nem található ebben a webshopban.';
  end if;

  if v_order.status=v_target_status then
    return jsonb_build_object(
      'order_id',v_order.id,
      'status',v_order.status,
      'replayed',true,
      'inventory_restored',false
    );
  end if;

  v_allowed:=case v_order.status
    when 'draft' then v_target_status in ('pending','pending_payment','pending_transfer','cancelled')
    when 'pending' then v_target_status in ('paid','processing','cancelled')
    when 'pending_payment' then v_target_status in ('paid','cancelled')
    when 'pending_transfer' then v_target_status in ('paid','cancelled')
    when 'paid' then v_target_status in ('processing','refunded')
    when 'processing' then v_target_status in ('shipped','refunded')
    when 'shipped' then v_target_status in ('completed','refunded')
    when 'completed' then v_target_status='refunded'
    else false
  end;

  if not v_allowed then
    raise exception 'Nem engedélyezett rendelési állapotváltás: % -> %',v_order.status,v_target_status;
  end if;

  if v_target_status='shipped'
     and coalesce(v_order.shipping_method,'')<>'pickup'
     and coalesce(nullif(trim(p_tracking_number),''),v_order.tracking_number) is null then
    raise exception 'Feladott rendeléshez csomagkövetési azonosító szükséges.';
  end if;

  -- Only cancellation before fulfillment returns inventory automatically.
  -- A financial refund never implies physical return.
  if v_target_status='cancelled' then
    for v_line in
      select oi.id,oi.quantity
      from public.order_items oi
      where oi.order_id=p_order_id
        and oi.instance_id=p_instance_id
        and oi.variant_id is not null
      order by oi.id
      for update
    loop
      select coalesce(sum(r.quantity),0)::integer
      into v_already
      from public.order_inventory_restorations r
      where r.instance_id=p_instance_id
        and r.order_item_id=v_line.id;

      v_remaining:=greatest(0,v_line.quantity-v_already);
      if v_remaining>0 then
        select public.restore_order_item_inventory_v1(
          p_instance_id,p_order_id,v_line.id,'order_cancelled',p_order_id,
          v_remaining,p_actor
        ) into v_result;
        if coalesce((v_result->>'restored')::boolean,false) then
          v_restore:=true;
        end if;
      end if;
    end loop;
  end if;

  update public.orders
  set status=v_target_status,
      tracking_number=case
        when p_tracking_number is null then tracking_number
        else nullif(trim(p_tracking_number),'')
      end,
      paid_at=case
        when v_target_status='paid' and paid_at is null then now()
        else paid_at
      end,
      updated_at=now()
  where id=p_order_id and instance_id=p_instance_id;

  insert into public.order_events(
    instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata
  ) values(
    p_instance_id,p_order_id,'status_changed',v_order.status,v_target_status,p_actor,
    jsonb_build_object(
      'inventory_restored',v_restore,
      'refund_inventory_policy',case when v_target_status='refunded' then 'return_case_only' else null end,
      'tracking_number',coalesce(p_tracking_number,v_order.tracking_number)
    )
  );

  return jsonb_build_object(
    'order_id',p_order_id,
    'status',v_target_status,
    'inventory_restored',v_restore,
    'replayed',false
  );
end;
$$;

revoke all on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text)
from public,anon,authenticated;
grant execute on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text)
to service_role;

comment on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text)
is 'Tenant-safe order lifecycle transition with validated enum status, inventory restoration and event evidence.';
