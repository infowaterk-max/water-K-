alter table public.return_cases add column if not exists inventory_restocked_at timestamptz;
alter table public.return_cases add column if not exists inventory_restocked_by uuid references auth.users(id) on delete set null;

create or replace function public.restock_return_case(p_case_id uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c record;i record;v_prev integer;v_count integer:=0;
begin
 select * into c from public.return_cases where id=p_case_id for update;
 if not found then raise exception 'A visszáru ügy nem található.'; end if;
 if c.status not in ('received','refund_pending','refunded','closed') then raise exception 'Csak visszaérkezett termék készletezhető vissza.'; end if;
 if c.inventory_restocked_at is not null then raise exception 'A visszáru készlete már vissza lett állítva.'; end if;
 for i in select oi.variant_id,oi.quantity,oi.sku from public.order_items oi where oi.order_id=c.order_id and oi.variant_id is not null loop
  select stock_quantity into v_prev from public.product_variants where id=i.variant_id for update;
  update public.product_variants set stock_quantity=stock_quantity+i.quantity where id=i.variant_id;
  insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
  values(i.variant_id,c.order_id,i.quantity,v_prev,v_prev+i.quantity,'return_restocked',p_actor,jsonb_build_object('return_case_id',p_case_id,'sku',i.sku));
  v_count:=v_count+1;
 end loop;
 update public.return_cases set inventory_restocked_at=now(),inventory_restocked_by=p_actor,updated_at=now() where id=p_case_id;
 return jsonb_build_object('restocked_lines',v_count);
end;$$;
revoke all on function public.restock_return_case(uuid,uuid) from public,anon,authenticated;
grant execute on function public.restock_return_case(uuid,uuid) to service_role;