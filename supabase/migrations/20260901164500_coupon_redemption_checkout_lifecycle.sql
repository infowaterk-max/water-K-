-- Core Engine 2.0: wire coupon redemption ledger into atomic checkout and cancellation.
-- Keep the already hardened checkout implementation and replace direct coupon counter mutation
-- with order-bound redemption bookkeeping through a trigger that runs in the same transaction.

create or replace function public.sync_coupon_redemption_from_order_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_existing public.coupon_redemptions%rowtype;
begin
  if tg_op='INSERT' then
    if nullif(trim(new.coupon_code),'') is null then return new; end if;
    select * into v_coupon from public.coupons where instance_id=new.instance_id and code=upper(trim(new.coupon_code)) for update;
    if not found then return new; end if;
    -- Checkout inserts the order before the final discount is known; ledger creation is deferred
    -- to the totals update below.
    return new;
  end if;

  if tg_op='UPDATE' then
    if nullif(trim(new.coupon_code),'') is not null and new.discount_gross_huf>0
       and (old.discount_gross_huf is distinct from new.discount_gross_huf or old.coupon_code is distinct from new.coupon_code) then
      select * into v_coupon from public.coupons where instance_id=new.instance_id and code=upper(trim(new.coupon_code)) for update;
      if found then
        select * into v_existing from public.coupon_redemptions where instance_id=new.instance_id and order_id=new.id and coupon_id=v_coupon.id for update;
        if not found then
          insert into public.coupon_redemptions(instance_id,coupon_id,order_id,customer_id,customer_email,coupon_code,discount_gross_huf,metadata)
          values(new.instance_id,v_coupon.id,new.id,new.customer_id,lower(trim(new.customer_email)),v_coupon.code,new.discount_gross_huf,jsonb_build_object('source','atomic_checkout'));
        elsif v_existing.status='redeemed' then
          update public.coupon_redemptions set discount_gross_huf=new.discount_gross_huf,updated_at=now() where id=v_existing.id;
        end if;
      end if;
    end if;

    if new.status='cancelled' and old.status is distinct from new.status then
      perform public.release_coupon_redemption_v1(new.instance_id,new.id,'order_cancelled');
    end if;
  end if;
  return new;
end $$;

revoke all on function public.sync_coupon_redemption_from_order_v1() from public,anon,authenticated;
grant execute on function public.sync_coupon_redemption_from_order_v1() to service_role;

drop trigger if exists orders_coupon_redemption_sync on public.orders;
create trigger orders_coupon_redemption_sync
after insert or update of coupon_code,discount_gross_huf,status on public.orders
for each row execute function public.sync_coupon_redemption_from_order_v1();

-- The existing atomic checkout increments coupons.usage_count before updating the order totals.
-- The trigger above records the corresponding redemption in the same transaction.
-- Cancellation releases that exact redemption and decrements the same tenant coupon counter.
-- Existing cancelled-order legacy trigger logic must not decrement the counter a second time.
create or replace function public.restore_cancelled_order_inventory()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  r record;
  v_already integer;
  v_remaining integer;
begin
  if new.status='cancelled' and old.status is distinct from new.status then
    for r in
      select oi.id,oi.quantity
      from public.order_items oi
      where oi.order_id=new.id and oi.instance_id=new.instance_id and oi.variant_id is not null
      order by oi.id
      for update
    loop
      select coalesce(sum(x.quantity),0)::integer into v_already
      from public.order_inventory_restorations x
      where x.instance_id=new.instance_id and x.order_item_id=r.id;
      v_remaining:=greatest(0,r.quantity-v_already);
      if v_remaining>0 then
        perform public.restore_order_item_inventory_v1(new.instance_id,new.id,r.id,'order_cancelled',new.id,v_remaining,null);
      end if;
    end loop;
    -- Coupon usage is released exclusively by orders_coupon_redemption_sync.
  end if;
  return new;
end $$;

revoke all on function public.restore_cancelled_order_inventory() from public,anon,authenticated;
grant execute on function public.restore_cancelled_order_inventory() to service_role;
