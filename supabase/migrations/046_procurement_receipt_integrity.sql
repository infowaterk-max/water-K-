-- V8 procurement receipt integrity.
-- Receipt must be atomic: stock, inventory events, received quantities and PO status
-- either all commit or all roll back together.

alter table public.purchase_order_items
  drop constraint if exists purchase_order_items_received_quantity_check;
alter table public.purchase_order_items
  add constraint purchase_order_items_received_quantity_check
  check (received_quantity >= 0 and received_quantity <= quantity);

create unique index if not exists purchase_order_items_order_variant_uq
  on public.purchase_order_items(purchase_order_id,variant_id);

create or replace function public.receive_purchase_order(p_purchase_order_id uuid,p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  po record;
  item record;
  previous_qty integer;
  add_qty integer;
  received_lines integer:=0;
  received_units integer:=0;
begin
  select id,order_number,status into po
  from public.purchase_orders
  where id=p_purchase_order_id
  for update;

  if not found then raise exception 'A beszerzés nem található.'; end if;
  if po.status not in ('ordered','partially_received') then
    raise exception 'Csak megrendelt beszerzés vételezhető be.';
  end if;

  for item in
    select id,variant_id,quantity,received_quantity
    from public.purchase_order_items
    where purchase_order_id=p_purchase_order_id
    order by id
    for update
  loop
    add_qty:=item.quantity-item.received_quantity;
    if add_qty<=0 then continue; end if;

    select stock_quantity into previous_qty
    from public.product_variants
    where id=item.variant_id
    for update;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;

    update public.product_variants
      set stock_quantity=stock_quantity+add_qty,updated_at=now()
      where id=item.variant_id;

    update public.purchase_order_items
      set received_quantity=quantity
      where id=item.id;

    insert into public.inventory_events(
      variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata
    ) values(
      item.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,
      jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'received_quantity',add_qty)
    );

    received_lines:=received_lines+1;
    received_units:=received_units+add_qty;
  end loop;

  if received_lines=0 then raise exception 'A beszerzés minden tétele már be lett vételezve.'; end if;

  update public.purchase_orders
    set status='received',updated_at=now()
    where id=p_purchase_order_id;

  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'status','received');
end;
$$;

revoke all on function public.receive_purchase_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.receive_purchase_order(uuid,uuid) to service_role;
comment on function public.receive_purchase_order(uuid,uuid) is 'Atomically receives all outstanding quantities of one ordered purchase order and updates inventory.';
