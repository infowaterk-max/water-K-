-- V8 cancellation stock integrity.
-- Orders reserve stock at creation, therefore a transition into cancelled must release it atomically.
create or replace function public.restore_cancelled_order_inventory()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  line record;
  previous_qty integer;
begin
  if new.status='cancelled' and old.status is distinct from 'cancelled' then
    for line in
      select oi.variant_id,oi.quantity,oi.sku
      from public.order_items oi
      where oi.order_id=new.id and oi.variant_id is not null
    loop
      select stock_quantity into previous_qty from public.product_variants where id=line.variant_id for update;
      if found then
        update public.product_variants set stock_quantity=stock_quantity+line.quantity,updated_at=now() where id=line.variant_id;
        insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
        values(line.variant_id,new.id,line.quantity,previous_qty,previous_qty+line.quantity,'order_cancelled',null,jsonb_build_object('sku',line.sku,'order_number',new.order_number));
      end if;
    end loop;
    if new.coupon_code is not null and length(trim(new.coupon_code))>0 then
      update public.coupons set usage_count=greatest(0,usage_count-1),updated_at=now() where code=upper(trim(new.coupon_code));
      insert into public.order_events(order_id,event_type,from_status,to_status,metadata)
      values(new.id,'coupon_released',old.status,new.status,jsonb_build_object('code',new.coupon_code));
    end if;
    insert into public.order_events(order_id,event_type,from_status,to_status,metadata)
    values(new.id,'inventory_restored_on_cancel',old.status,new.status,jsonb_build_object('reason','order_cancelled'));
  end if;
  return new;
end;
$$;
revoke all on function public.restore_cancelled_order_inventory() from public,anon,authenticated;
drop trigger if exists restore_inventory_after_order_cancel on public.orders;
create trigger restore_inventory_after_order_cancel
after update of status on public.orders
for each row execute function public.restore_cancelled_order_inventory();
comment on function public.restore_cancelled_order_inventory() is 'Atomically releases reserved stock and coupon usage when an order first transitions to cancelled.';
