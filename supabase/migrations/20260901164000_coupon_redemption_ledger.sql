-- Core Engine 2.0: tenant-safe, order-bound coupon redemption ledger.

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid null,
  customer_email text not null,
  coupon_code text not null,
  discount_gross_huf integer not null check (discount_gross_huf >= 0),
  status text not null default 'redeemed' check (status in ('redeemed','released')),
  redeemed_at timestamptz not null default now(),
  released_at timestamptz null,
  release_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id, order_id, coupon_id)
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(instance_id,coupon_id,status);
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions(instance_id,customer_id,coupon_id,status) where customer_id is not null;
create index if not exists coupon_redemptions_email_idx on public.coupon_redemptions(instance_id,lower(customer_email),coupon_id,status);
alter table public.coupon_redemptions enable row level security;
revoke all on table public.coupon_redemptions from public, anon, authenticated;
grant select,insert,update,delete on table public.coupon_redemptions to service_role;

create or replace function public.record_coupon_redemption_v1(
  p_instance_id uuid,p_order_id uuid,p_coupon_code text,p_discount_gross_huf integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype;v_coupon public.coupons%rowtype;v_existing public.coupon_redemptions%rowtype;begin
  if nullif(trim(p_coupon_code),'') is null then return jsonb_build_object('recorded',false,'reason','no_coupon'); end if;
  select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_coupon from public.coupons where instance_id=p_instance_id and code=upper(trim(p_coupon_code)) for update;
  if not found then raise exception 'coupon_not_found'; end if;
  select * into v_existing from public.coupon_redemptions where instance_id=p_instance_id and order_id=p_order_id and coupon_id=v_coupon.id for update;
  if found then
    if v_existing.status='released' then
      update public.coupon_redemptions set status='redeemed',released_at=null,release_reason=null,discount_gross_huf=p_discount_gross_huf,updated_at=now() where id=v_existing.id;
      update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id;
      return jsonb_build_object('recorded',true,'replayed',false,'reactivated',true,'redemption_id',v_existing.id);
    end if;
    return jsonb_build_object('recorded',false,'replayed',true,'redemption_id',v_existing.id);
  end if;
  insert into public.coupon_redemptions(instance_id,coupon_id,order_id,customer_id,customer_email,coupon_code,discount_gross_huf,metadata)
  values(p_instance_id,v_coupon.id,p_order_id,v_order.customer_id,lower(trim(v_order.customer_email)),v_coupon.code,greatest(0,p_discount_gross_huf),jsonb_build_object('source','core_checkout')) returning * into v_existing;
  return jsonb_build_object('recorded',true,'replayed',false,'redemption_id',v_existing.id);
end $$;

create or replace function public.release_coupon_redemption_v1(
  p_instance_id uuid,p_order_id uuid,p_reason text default 'order_cancelled'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_redemption public.coupon_redemptions%rowtype;begin
  select * into v_redemption from public.coupon_redemptions where instance_id=p_instance_id and order_id=p_order_id and status='redeemed' order by redeemed_at limit 1 for update;
  if not found then return jsonb_build_object('released',false,'replayed',true); end if;
  update public.coupon_redemptions set status='released',released_at=now(),release_reason=coalesce(nullif(trim(p_reason),''),'order_cancelled'),updated_at=now() where id=v_redemption.id;
  update public.coupons set usage_count=greatest(0,usage_count-1),updated_at=now() where id=v_redemption.coupon_id and instance_id=p_instance_id;
  return jsonb_build_object('released',true,'replayed',false,'redemption_id',v_redemption.id);
end $$;

revoke all on function public.record_coupon_redemption_v1(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.record_coupon_redemption_v1(uuid,uuid,text,integer) to service_role;
revoke all on function public.release_coupon_redemption_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.release_coupon_redemption_v1(uuid,uuid,text) to service_role;

-- Backfill ledger rows for existing coupon-bearing orders without changing counters.
insert into public.coupon_redemptions(instance_id,coupon_id,order_id,customer_id,customer_email,coupon_code,discount_gross_huf,status,redeemed_at,metadata)
select o.instance_id,c.id,o.id,o.customer_id,lower(trim(o.customer_email)),c.code,coalesce(o.discount_gross_huf,0),case when o.status='cancelled' then 'released' else 'redeemed' end,coalesce(o.created_at,now()),jsonb_build_object('source','migration_backfill')
from public.orders o join public.coupons c on c.instance_id=o.instance_id and c.code=upper(trim(o.coupon_code))
where nullif(trim(o.coupon_code),'') is not null
on conflict(instance_id,order_id,coupon_id) do nothing;
