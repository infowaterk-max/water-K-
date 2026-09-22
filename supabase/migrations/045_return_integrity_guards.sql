-- V8 return-flow integrity hardening.
-- Keeps partial returns, cumulative returned quantities, refunds and stock restoration consistent.

alter table public.return_cases add column if not exists inventory_restocked_at timestamptz;
alter table public.return_cases add column if not exists inventory_restocked_by uuid references auth.users(id) on delete set null;

create or replace function public.validate_return_case_item_quantity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_item record;
  v_case record;
  v_already integer;
begin
  select id,order_id,quantity into v_order_item from public.order_items where id=new.order_item_id;
  if not found then raise exception 'A rendelési tétel nem található.'; end if;
  select id,order_id,status into v_case from public.return_cases where id=new.return_case_id;
  if not found then raise exception 'A visszáru ügy nem található.'; end if;
  if v_case.order_id<>v_order_item.order_id then raise exception 'A visszáru tétel nem ehhez a rendeléshez tartozik.'; end if;
  select coalesce(sum(rci.quantity),0) into v_already
  from public.return_case_items rci
  join public.return_cases rc on rc.id=rci.return_case_id
  where rci.order_item_id=new.order_item_id
    and rc.status<>'rejected'
    and (tg_op='INSERT' or rci.id<>new.id);
  if v_already+new.quantity>v_order_item.quantity then
    raise exception 'A visszaküldött összmennyiség meghaladná a megvásárolt mennyiséget.';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_return_case_item_quantity() from public,anon,authenticated;
drop trigger if exists validate_return_case_item_quantity_trigger on public.return_case_items;
create trigger validate_return_case_item_quantity_trigger
before insert or update of quantity,order_item_id,return_case_id on public.return_case_items
for each row execute function public.validate_return_case_item_quantity();

create or replace function public.validate_refund_total()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_total integer;
  v_other_refunded integer;
begin
  if new.refund_amount_gross_huf is not null then
    select total_gross_huf into v_order_total from public.orders where id=new.order_id;
    if new.refund_amount_gross_huf>coalesce(v_order_total,0) then raise exception 'A visszatérítés nem lehet nagyobb a rendelés értékénél.'; end if;
  end if;
  if new.status='refunded' then
    if new.refund_amount_gross_huf is null then raise exception 'A visszatérített állapothoz visszatérítési összeg szükséges.'; end if;
    select coalesce(sum(refund_amount_gross_huf),0) into v_other_refunded
    from public.return_cases
    where order_id=new.order_id and status='refunded' and id<>new.id;
    if v_other_refunded+new.refund_amount_gross_huf>coalesce(v_order_total,0) then
      raise exception 'A visszatérítések összege meghaladná a rendelés teljes értékét.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_refund_total() from public,anon,authenticated;
drop trigger if exists validate_refund_total_trigger on public.return_cases;
create trigger validate_refund_total_trigger
before insert or update of status,refund_amount_gross_huf on public.return_cases
for each row execute function public.validate_refund_total();

create or replace function public.restock_return_case(p_case_id uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c record;i record;v_prev integer;v_count integer:=0;v_units integer:=0;
begin
 select * into c from public.return_cases where id=p_case_id for update;
 if not found then raise exception 'A visszáru ügy nem található.'; end if;
 if c.status not in ('received','refund_pending','refunded','closed') then raise exception 'Csak visszaérkezett termék készletezhető vissza.'; end if;
 if c.inventory_restocked_at is not null then raise exception 'A visszáru készlete már vissza lett állítva.'; end if;
 for i in
  select oi.variant_id,oi.sku,rci.quantity
  from public.return_case_items rci
  join public.order_items oi on oi.id=rci.order_item_id
  where rci.return_case_id=p_case_id and oi.order_id=c.order_id and oi.variant_id is not null
 loop
  if i.quantity<=0 then continue; end if;
  select stock_quantity into v_prev from public.product_variants where id=i.variant_id for update;
  if not found then raise exception 'A visszaküldött termékváltozat nem található.'; end if;
  update public.product_variants set stock_quantity=stock_quantity+i.quantity,updated_at=now() where id=i.variant_id;
  insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
  values(i.variant_id,c.order_id,i.quantity,v_prev,v_prev+i.quantity,'return_restocked',p_actor,jsonb_build_object('return_case_id',p_case_id,'sku',i.sku,'returned_quantity',i.quantity));
  v_count:=v_count+1;v_units:=v_units+i.quantity;
 end loop;
 if v_count=0 then raise exception 'Nincs készletre visszahelyezhető tétel ebben az ügyben.'; end if;
 update public.return_cases set inventory_restocked_at=now(),inventory_restocked_by=p_actor,updated_at=now() where id=p_case_id;
 return jsonb_build_object('restocked_lines',v_count,'restocked_units',v_units);
end;$$;
revoke all on function public.restock_return_case(uuid,uuid) from public,anon,authenticated;
grant execute on function public.restock_return_case(uuid,uuid) to service_role;
