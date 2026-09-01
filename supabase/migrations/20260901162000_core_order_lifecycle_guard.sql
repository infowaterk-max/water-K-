-- Core Engine 2.0: atomic tenant-safe cancellation/refund lifecycle guard.
create table if not exists public.order_inventory_restorations(
 id uuid primary key default gen_random_uuid(),instance_id uuid not null references public.webshop_instances(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,reason text not null check(reason in('cancelled','refunded')),
 actor_user_id uuid references auth.users(id),created_at timestamptz not null default now(),unique(instance_id,order_id)
);
alter table public.order_inventory_restorations enable row level security;
create policy order_inventory_restorations_store_read on public.order_inventory_restorations for select to authenticated using(public.can_manage_orders(instance_id));

create or replace function public.transition_tenant_order_v1(p_instance_id uuid,p_order_id uuid,p_actor uuid,p_target_status text,p_tracking_number text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype;v_allowed boolean:=false;v_restore boolean:=false;v_inserted uuid;
begin
 select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;
 if not found then raise exception 'A rendelés nem található ebben a webshopban.';end if;
 if v_order.status=p_target_status then return jsonb_build_object('order_id',v_order.id,'status',v_order.status,'replayed',true);end if;
 v_allowed:=case v_order.status
  when 'draft' then p_target_status=any(array['pending','pending_payment','pending_transfer','cancelled'])
  when 'pending' then p_target_status=any(array['paid','processing','cancelled'])
  when 'pending_payment' then p_target_status=any(array['paid','cancelled'])
  when 'pending_transfer' then p_target_status=any(array['paid','cancelled'])
  when 'paid' then p_target_status=any(array['processing','refunded','cancelled'])
  when 'processing' then p_target_status=any(array['shipped','refunded','cancelled'])
  when 'shipped' then p_target_status=any(array['completed','refunded'])
  when 'completed' then p_target_status='refunded' else false end;
 if not v_allowed then raise exception 'Nem engedélyezett rendelési állapotváltás: % -> %',v_order.status,p_target_status;end if;
 if p_target_status='shipped' and coalesce(v_order.shipping_method,'')<>'pickup' and coalesce(nullif(trim(p_tracking_number),''),v_order.tracking_number) is null then raise exception 'Feladott rendeléshez csomagkövetési azonosító szükséges.';end if;
 if p_target_status in('cancelled','refunded') then
  insert into public.order_inventory_restorations(instance_id,order_id,reason,actor_user_id) values(p_instance_id,p_order_id,p_target_status,p_actor) on conflict(instance_id,order_id) do nothing returning id into v_inserted;
  if v_inserted is not null then
   update public.product_variants pv set stock_quantity=pv.stock_quantity+oi.quantity
    from public.order_items oi where oi.order_id=p_order_id and oi.variant_id=pv.id and pv.instance_id=p_instance_id;
   v_restore:=true;
  end if;
 end if;
 update public.orders set status=p_target_status,tracking_number=case when p_tracking_number is null then tracking_number else nullif(trim(p_tracking_number),'') end,
  paid_at=case when p_target_status='paid' and paid_at is null then now() else paid_at end,updated_at=now() where id=p_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata)
 values(p_instance_id,p_order_id,'status_changed',v_order.status,p_target_status,p_actor,jsonb_build_object('inventory_restored',v_restore,'tracking_number',coalesce(p_tracking_number,v_order.tracking_number)));
 return jsonb_build_object('order_id',p_order_id,'status',p_target_status,'inventory_restored',v_restore,'replayed',false);
end $$;
revoke all on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) to service_role;
