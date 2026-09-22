-- Core Engine 2.0: cancellation compatibility trigger must share the item-level
-- restoration ledger with the explicit lifecycle RPC. This prevents double restock.
create or replace function public.restore_cancelled_order_inventory()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_line record;
  v_already integer;
  v_remaining integer;
  v_result jsonb;
begin
  if new.status='cancelled' and old.status is distinct from 'cancelled' then
    if exists(
      select 1 from public.order_operations op
      where op.order_id=new.id and op.instance_id=new.instance_id
        and op.operational_status in ('handed_over','delivered')
    ) then
      raise exception 'A futárnak átadott vagy kézbesített rendelés nem törölhető; használj visszáru/visszatérítés folyamatot.';
    end if;

    for v_line in
      select oi.id,oi.quantity
      from public.order_items oi
      where oi.order_id=new.id and oi.instance_id=new.instance_id and oi.variant_id is not null
      order by oi.id
      for update
    loop
      select coalesce(sum(r.quantity),0)::integer into v_already
      from public.order_inventory_restorations r
      where r.instance_id=new.instance_id and r.order_item_id=v_line.id;
      v_remaining:=greatest(0,v_line.quantity-v_already);
      if v_remaining>0 then
        select public.restore_order_item_inventory_v1(
          new.instance_id,new.id,v_line.id,'order_cancelled',new.id,v_remaining,null
        ) into v_result;
      end if;
    end loop;

    update public.inventory_reservations
       set status='released',released_at=coalesce(released_at,now()),
           reason='Rendelés törölve; a készlet-visszaállítást az item ledger kezeli',updated_at=now()
     where instance_id=new.instance_id and order_id=new.id and status in ('active','consumed');

    if new.coupon_code is not null and length(trim(new.coupon_code))>0 then
      update public.coupons
         set usage_count=greatest(0,usage_count-1),updated_at=now()
       where instance_id=new.instance_id and code=upper(trim(new.coupon_code));
      insert into public.order_events(instance_id,order_id,event_type,from_status,to_status,metadata)
      values(new.instance_id,new.id,'coupon_released',old.status,new.status,jsonb_build_object('code',new.coupon_code));
    end if;

    update public.order_operations
       set operational_status='cancelled',exception_code=null,updated_at=now()
     where instance_id=new.instance_id and order_id=new.id;

    insert into public.order_events(instance_id,order_id,event_type,from_status,to_status,metadata)
    values(new.instance_id,new.id,'inventory_restored_on_cancel',old.status,new.status,
      jsonb_build_object('reason','order_cancelled','restock_policy','item-ledger'));
  end if;
  return new;
end $$;

revoke all on function public.restore_cancelled_order_inventory() from public, anon, authenticated;
grant execute on function public.restore_cancelled_order_inventory() to service_role;

-- Internal operational helpers expose order-level operational data and must not
-- be directly executable by storefront roles.
revoke all on function public.release_inventory_for_order(uuid,text) from public, anon, authenticated;
grant execute on function public.release_inventory_for_order(uuid,text) to service_role;
revoke all on function public.get_order_operation_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_order_operation_snapshot(uuid) to service_role;
