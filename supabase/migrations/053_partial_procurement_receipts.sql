create or replace function public.receive_purchase_order_items(
  p_purchase_order_id uuid,
  p_actor uuid,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  po record;
  req jsonb;
  poi record;
  previous_qty integer;
  add_qty integer;
  remaining integer;
  received_lines integer:=0;
  received_units integer:=0;
  final_status text;
begin
  select id,order_number,status into po
  from public.purchase_orders where id=p_purchase_order_id for update;
  if not found then raise exception 'A beszerzés nem található.'; end if;
  if po.status not in ('ordered','partially_received') then
    raise exception 'Csak megrendelt beszerzés vételezhető be.';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy bevételezendő tétel szükséges.';
  end if;

  for req in select value from jsonb_array_elements(p_items) loop
    add_qty:=(req->>'quantity')::integer;
    if add_qty<=0 then raise exception 'A bevételezett mennyiségnek pozitívnak kell lennie.'; end if;

    select id,variant_id,quantity,received_quantity into poi
    from public.purchase_order_items
    where id=(req->>'itemId')::uuid and purchase_order_id=p_purchase_order_id
    for update;
    if not found then raise exception 'A beszerzési tétel nem található.'; end if;
    if poi.received_quantity+add_qty>poi.quantity then
      raise exception 'A bevételezett mennyiség meghaladná a megrendelt mennyiséget.';
    end if;

    select stock_quantity into previous_qty
    from public.product_variants where id=poi.variant_id for update;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;

    update public.product_variants
      set stock_quantity=stock_quantity+add_qty,updated_at=now()
      where id=poi.variant_id;
    update public.purchase_order_items
      set received_quantity=received_quantity+add_qty
      where id=poi.id;

    insert into public.inventory_events(
      variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata
    ) values(
      poi.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,
      jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'purchase_order_item_id',poi.id,'received_quantity',add_qty,'partial',true)
    );
    received_lines:=received_lines+1;
    received_units:=received_units+add_qty;
  end loop;

  select coalesce(sum(quantity-received_quantity),0)::integer into remaining
  from public.purchase_order_items where purchase_order_id=p_purchase_order_id;
  final_status:=case when remaining=0 then 'received' else 'partially_received' end;
  update public.purchase_orders set status=final_status,updated_at=now() where id=p_purchase_order_id;

  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'remaining_units',remaining,'status',final_status);
end;$$;

revoke all on function public.receive_purchase_order_items(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.receive_purchase_order_items(uuid,uuid,jsonb) to service_role;
comment on function public.receive_purchase_order_items(uuid,uuid,jsonb) is 'Atomically receives selected quantities and sets purchase order to partially_received or received.';
