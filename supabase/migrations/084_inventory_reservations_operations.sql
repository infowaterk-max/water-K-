-- V12: stock reservations, ATP and operational order state
create table if not exists public.inventory_reservations(
  id uuid primary key default gen_random_uuid(),
  reservation_key text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check(quantity>0),
  status text not null default 'active' check(status in ('active','consumed','released','cancelled')),
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_item_id)
);
create index if not exists inventory_reservations_variant_idx on public.inventory_reservations(variant_id,status);
create index if not exists inventory_reservations_order_idx on public.inventory_reservations(order_id,status);
alter table public.inventory_reservations enable row level security;
revoke all on public.inventory_reservations from anon,authenticated;
grant all on public.inventory_reservations to service_role;

create table if not exists public.order_operations(
  order_id uuid primary key references public.orders(id) on delete cascade,
  operational_status text not null default 'awaiting_reservation' check(operational_status in ('awaiting_reservation','reserved','ready_to_pack','packed','handed_over','delivered','blocked','cancelled')),
  priority_score integer not null default 50 check(priority_score between 0 and 100),
  exception_code text,
  reservation_completed_at timestamptz,
  ready_to_pack_at timestamptz,
  packed_at timestamptz,
  handed_over_at timestamptz,
  delivered_at timestamptz,
  blocked_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
alter table public.order_operations enable row level security;
revoke all on public.order_operations from anon,authenticated;
grant all on public.order_operations to service_role;

create or replace view public.inventory_available_to_promise with(security_invoker=true) as
select v.id as variant_id,v.sku,v.label,v.stock_quantity as on_hand_quantity,
       coalesce(r.reserved_quantity,0)::integer as reserved_quantity,
       greatest(v.stock_quantity-coalesce(r.reserved_quantity,0),0)::integer as available_to_promise_quantity,
       case when v.stock_quantity-coalesce(r.reserved_quantity,0)<0 then abs(v.stock_quantity-coalesce(r.reserved_quantity,0)) else 0 end::integer as oversold_quantity
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
declare i record;v_available integer;v_created integer:=0;v_existing integer:=0;v_order_status public.order_status;begin
 perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
 select status into v_order_status from public.orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if v_order_status in ('cancelled','refunded') then raise exception 'order_not_reservable'; end if;
 insert into public.order_operations(order_id) values(p_order_id) on conflict(order_id) do nothing;
 for i in select oi.id as order_item_id,oi.variant_id,oi.quantity from public.order_items oi where oi.order_id=p_order_id order by oi.variant_id,oi.id loop
   if i.variant_id is null then raise exception 'order_item_variant_missing'; end if;
   if exists(select 1 from public.inventory_reservations where order_item_id=i.order_item_id and status in ('active','consumed')) then v_existing:=v_existing+1;continue; end if;
   perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||i.variant_id::text,0));
   select greatest(v.stock_quantity-coalesce((select sum(r.quantity) from public.inventory_reservations r where r.variant_id=v.id and r.status='active'),0),0)::integer
     into v_available from public.product_variants v where v.id=i.variant_id for update;
   if v_available<i.quantity then
     update public.order_operations set operational_status='blocked',exception_code='insufficient_stock',blocked_at=coalesce(blocked_at,now()),updated_at=now(),metadata=metadata||jsonb_build_object('failed_variant_id',i.variant_id,'required_quantity',i.quantity,'available_quantity',v_available) where order_id=p_order_id;
     raise exception 'insufficient_stock';
   end if;
   insert into public.inventory_reservations(reservation_key,order_id,order_item_id,variant_id,quantity,status,reason)
   values('order-item:'||i.order_item_id::text,p_order_id,i.order_item_id,i.variant_id,i.quantity,'active','Rendelési készletfoglalás')
   on conflict(order_item_id) do nothing;
   get diagnostics v_created=row_count;
 end loop;
 if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'order_has_no_items'; end if;
 update public.order_operations set operational_status='reserved',reservation_completed_at=coalesce(reservation_completed_at,now()),exception_code=null,blocked_at=null,updated_at=now() where order_id=p_order_id;
 return jsonb_build_object('order_id',p_order_id,'created_reservations',v_created,'existing_reservations',v_existing,'status','reserved');
end;$$;
revoke all on function public.reserve_inventory_for_order(uuid) from public,anon,authenticated;
grant execute on function public.reserve_inventory_for_order(uuid) to service_role;

create or replace function public.release_inventory_for_order(p_order_id uuid,p_reason text default 'order_released')
returns integer language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
 update public.inventory_reservations set status='released',released_at=now(),reason=coalesce(nullif(trim(p_reason),''),reason),updated_at=now() where order_id=p_order_id and status='active';
 get diagnostics v_count=row_count;
 update public.order_operations set operational_status=case when exists(select 1 from public.orders where id=p_order_id and status='cancelled') then 'cancelled' else 'awaiting_reservation' end,updated_at=now() where order_id=p_order_id;
 return v_count;
end;$$;
revoke all on function public.release_inventory_for_order(uuid,text) from public,anon,authenticated;
grant execute on function public.release_inventory_for_order(uuid,text) to service_role;

create or replace view public.order_operations_queue with(security_invoker=true) as
select o.id as order_id,o.order_number,o.status as commerce_status,o.created_at,o.total_gross_huf,o.customer_id,
       coalesce(op.operational_status,'awaiting_reservation') as operational_status,
       coalesce(op.priority_score,50) as priority_score,op.exception_code,
       coalesce(c.value_tier,'standard') as customer_value_tier,coalesce(c.value_score,0) as customer_value_score,
       extract(epoch from(now()-o.created_at))/3600.0 as age_hours
from public.orders o
left join public.order_operations op on op.order_id=o.id
left join public.customer_value_profiles c on c.customer_id=o.customer_id
where o.status not in ('completed','cancelled','refunded');
revoke all on public.order_operations_queue from public,anon,authenticated;
grant select on public.order_operations_queue to service_role;
