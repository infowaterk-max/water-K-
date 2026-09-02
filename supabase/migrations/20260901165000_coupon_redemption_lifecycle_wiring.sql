-- Wire the redemption ledger into the existing atomic checkout without rewriting the large checkout RPC.
-- The checkout already increments coupons.usage_count transactionally. This trigger records the exact redemption
-- in the same transaction once authoritative order totals are written.

create or replace function public.capture_order_coupon_redemption()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.instance_id is not null
     and nullif(trim(new.coupon_code),'') is not null
     and new.discount_gross_huf > 0
     and (tg_op='INSERT' or old.discount_gross_huf is distinct from new.discount_gross_huf or old.coupon_code is distinct from new.coupon_code)
  then
    perform public.record_coupon_redemption_v1(new.instance_id,new.id,new.coupon_code,new.discount_gross_huf);
  end if;
  return new;
end $$;

drop trigger if exists capture_coupon_redemption_after_order_totals on public.orders;
create trigger capture_coupon_redemption_after_order_totals
after insert or update of discount_gross_huf,coupon_code on public.orders
for each row execute function public.capture_order_coupon_redemption();

-- Cancellation releases the exact recorded redemption and decrements the legacy aggregate counter once.
create or replace function public.release_cancelled_order_coupon_redemption()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='cancelled' and old.status is distinct from new.status and nullif(trim(new.coupon_code),'') is not null then
    perform public.release_coupon_redemption_v1(new.instance_id,new.id,'order_cancelled');
  end if;
  return new;
end $$;

drop trigger if exists release_coupon_redemption_after_order_cancel on public.orders;
create trigger release_coupon_redemption_after_order_cancel
after update of status on public.orders
for each row execute function public.release_cancelled_order_coupon_redemption();

-- Trigger helpers are not public API.
revoke all on function public.capture_order_coupon_redemption() from public,anon,authenticated;
revoke all on function public.release_cancelled_order_coupon_redemption() from public,anon,authenticated;
