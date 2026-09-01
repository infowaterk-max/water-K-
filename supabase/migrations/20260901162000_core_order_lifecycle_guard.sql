-- Core Engine 2.0: atomic tenant-safe order lifecycle and shared item-level inventory restoration ledger.
create table if not exists public.order_inventory_restorations(
 id uuid primary key default gen_random_uuid(),
 instance_id uuid not null references public.webshop_instances(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 order_item_id uuid not null references public.order_items(id) on delete cascade,
 source_type text not null check(source_type in('order_cancelled','order_refunded','return_case')),
 source_id uuid not null,
 quantity integer not null check(quantity>0),
 actor_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(instance_id,order_item_id,source_type,source_id)
);
alter table public.order_inventory_restorations enable row level security;
drop policy if exists order_inventory_restorations_store_read on public.order_inventory_restorations;
create policy order_inventory_restorations_store_read on public.order_inventory_restorations for select to authenticated using(public.can_manage_orders(instance_id));

create or replace function public.restore_order_item_inventory_v1(p_instance_id uuid,p_order_id uuid,p_order_item_id uuid,p_source_type text,p_source_id uuid,p_quantity integer,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_item record;v_restored integer:=0;v_prev integer;v_inserted uuid;
begin
 if p_source_type not in('order_cancelled','order_refunded','return_case') then raise exception 'Érvénytelen készlet-visszaállítási forrás.';end if;
 if p_quantity is null or p_quantity<=0 then raise exception 'Érvénytelen visszaállítási mennyiség.';end if;
 select oi.id,oi.variant_id,oi.quantity,oi.sku into v_item from public.order_items oi where oi.id=p_order_item_id and oi.order_id=p_order_id and oi.instance_id=p_instance_id for update;
 if not found or v_item.variant_id is null then raise exception 'A rendelési tétel nem állítható vissza.';end if;
 select coalesce(sum(r.quantity),0)::integer into v_restored from public.order_inventory_restorations r where r.instance_id=p_instance_id and r.order_item_id=p_order_item_id;
 if v_restored+p_quantity>v_item.quantity then raise exception 'A készlet-visszaállítás meghaladná az eredetileg rendelt mennyiséget.';end if;
 insert into public.order_inventory_restorations(instance_id,order_id,order_item_id,source_type,source_id,quantity,actor_user_id)
 values(p_instance_id,p_order_id,p_order_item_id,p_source_type,p_source_id,p_quantity,p_actor)
 on conflict(instance_id,order_item_id,source_type,source_id) do nothing returning id into v_inserted;
 if v_inserted is null then return jsonb_build_object('restored',false,'replayed',true,'quantity',0);end if;
 select stock_quantity into v_prev from public.product_variants where id=v_item.variant_id and instance_id=p_instance_id for update;
 if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
 update public.product_variants set stock_quantity=stock_quantity+p_quantity,updated_at=now() where id=v_item.variant_id and instance_id=p_instance_id;
 insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
 values(p_instance_id,v_item.variant_id,p_order_id,p_quantity,v_prev,v_prev+p_quantity,'inventory_restored',p_actor,jsonb_build_object('order_item_id',p_order_item_id,'source_type',p_source_type,'source_id',p_source_id,'sku',v_item.sku));
 return jsonb_build_object('restored',true,'replayed',false,'quantity',p_quantity);
end $$;
revoke all on function public.restore_order_item_inventory_v1(uuid,uuid,uuid,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.restore_order_item_inventory_v1(uuid,uuid,uuid,text,uuid,integer,uuid) to service_role;

create or replace function public.restock_return_case(p_case_id uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.return_cases%rowtype;i record;v_result jsonb;v_count integer:=0;v_units integer:=0;
begin
 select * into c from public.return_cases where id=p_case_id for update;
 if not found then raise exception 'A visszáru ügy nem található.';end if;
 if c.status not in('received','refund_pending','refunded','closed') then raise exception 'Csak visszaérkezett termék készletezhető vissza.';end if;
 if c.inventory_restocked_at is not null then raise exception 'A visszáru készlete már vissza lett állítva.';end if;
 for i in select rci.order_item_id,rci.quantity from public.return_case_items rci join public.order_items oi on oi.id=rci.order_item_id where rci.return_case_id=p_case_id and rci.instance_id=c.instance_id and oi.order_id=c.order_id and oi.instance_id=c.instance_id and oi.variant_id is not null loop
  if i.quantity<=0 then continue;end if;
  select public.restore_order_item_inventory_v1(c.instance_id,c.order_id,i.order_item_id,'return_case',c.id,i.quantity,p_actor) into v_result;
  if coalesce((v_result->>'restored')::boolean,false) then v_count:=v_count+1;v_units:=v_units+i.quantity;end if;
 end loop;
 if v_count=0 then raise exception 'Nincs készletre visszahelyezhető tétel ebben az ügyben.';end if;
 update public.return_cases set inventory_restocked_at=now(),inventory_restocked_by=p_actor,updated_at=now() where id=c.id and instance_id=c.instance_id;
 return jsonb_build_object('restocked_lines',v_count,'restocked_units',v_units);
end $$;
revoke all on function public.restock_return_case(uuid,uuid) from public,anon,authenticated;
grant execute on function public.restock_return_case(uuid,uuid) to service_role;

create or replace function public.transition_tenant_order_v1(p_instance_id uuid,p_order_id uuid,p_actor uuid,p_target_status text,p_tracking_number text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype;v_allowed boolean:=false;v_restore boolean:=false;v_line record;v_already integer;v_remaining integer;v_result jsonb;v_source text;
begin
 select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;
 if not found then raise exception 'A rendelés nem található ebben a webshopban.';end if;
 if v_order.status=p_target_status then return jsonb_build_object('order_id',v_order.id,'status',v_order.status,'replayed',true,'inventory_restored',false);end if;
 v_allowed:=case v_order.status
  when 'draft' then p_target_status=any(array['pending','pending_payment','pending_transfer','cancelled'])
  when 'pending' then p_target_status=any(array['paid','processing','cancelled'])
  when 'pending_payment' then p_target_status=any(array['paid','cancelled'])
  when 'pending_transfer' then p_target_status=any(array['paid','cancelled'])
  when 'paid' then p_target_status=any(array['processing','refunded'])
  when 'processing' then p_target_status=any(array['shipped','refunded'])
  when 'shipped' then p_target_status=any(array['completed','refunded'])
  when 'completed' then p_target_status='refunded' else false end;
 if not v_allowed then raise exception 'Nem engedélyezett rendelési állapotváltás: % -> %',v_order.status,p_target_status;end if;
 if p_target_status='shipped' and coalesce(v_order.shipping_method,'')<>'pickup' and coalesce(nullif(trim(p_tracking_number),''),v_order.tracking_number) is null then raise exception 'Feladott rendeléshez csomagkövetési azonosító szükséges.';end if;
 if p_target_status in('cancelled','refunded') then
  v_source:=case when p_target_status='cancelled' then 'order_cancelled' else 'order_refunded' end;
  for v_line in select oi.id,oi.quantity from public.order_items oi where oi.order_id=p_order_id and oi.instance_id=p_instance_id and oi.variant_id is not null order by oi.id for update loop
   select coalesce(sum(r.quantity),0)::integer into v_already from public.order_inventory_restorations r where r.instance_id=p_instance_id and r.order_item_id=v_line.id;
   v_remaining:=greatest(0,v_line.quantity-v_already);
   if v_remaining>0 then
    select public.restore_order_item_inventory_v1(p_instance_id,p_order_id,v_line.id,v_source,p_order_id,v_remaining,p_actor) into v_result;
    if coalesce((v_result->>'restored')::boolean,false) then v_restore:=true;end if;
   end if;
  end loop;
 end if;
 update public.orders set status=p_target_status,tracking_number=case when p_tracking_number is null then tracking_number else nullif(trim(p_tracking_number),'') end,paid_at=case when p_target_status='paid' and paid_at is null then now() else paid_at end,updated_at=now() where id=p_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata)
 values(p_instance_id,p_order_id,'status_changed',v_order.status,p_target_status,p_actor,jsonb_build_object('inventory_restored',v_restore,'tracking_number',coalesce(p_tracking_number,v_order.tracking_number)));
 return jsonb_build_object('order_id',p_order_id,'status',p_target_status,'inventory_restored',v_restore,'replayed',false);
end $$;
revoke all on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) to service_role;
