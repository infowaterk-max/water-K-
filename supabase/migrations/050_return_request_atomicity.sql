create or replace function public.create_return_case(
  p_order_id uuid,
  p_user_id uuid,
  p_customer_email text,
  p_reason text,
  p_customer_note text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_case_id uuid;
  v_order record;
  v_item jsonb;
  v_order_item record;
  v_qty integer;
  v_open_case uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy visszaküldendő tétel szükséges.';
  end if;

  select id,customer_id,customer_email,status into v_order
  from public.orders where id=p_order_id for update;
  if not found or v_order.customer_id is distinct from p_user_id then
    raise exception 'A rendelés nem található.';
  end if;
  if v_order.status not in ('shipped','completed') then
    raise exception 'Ehhez a rendeléshez jelenleg nem indítható visszaküldési kérelem.';
  end if;

  select id into v_open_case from public.return_cases
  where order_id=p_order_id and user_id=p_user_id
    and status in ('requested','approved','received','refund_pending')
  limit 1 for update;
  if v_open_case is not null then
    raise exception 'Ehhez a rendeléshez már van folyamatban lévő ügy.';
  end if;

  insert into public.return_cases(order_id,user_id,customer_email,reason,customer_note)
  values(p_order_id,p_user_id,coalesce(nullif(trim(p_customer_email),''),v_order.customer_email),p_reason,nullif(trim(p_customer_note),''))
  returning id into v_case_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty <= 0 then raise exception 'Érvénytelen visszaküldési mennyiség.'; end if;
    select id,order_id,quantity into v_order_item
    from public.order_items where id=(v_item->>'orderItemId')::uuid;
    if not found or v_order_item.order_id<>p_order_id or v_qty>v_order_item.quantity then
      raise exception 'Érvénytelen visszaküldési tétel vagy mennyiség.';
    end if;
    insert into public.return_case_items(return_case_id,order_item_id,quantity)
    values(v_case_id,v_order_item.id,v_qty);
  end loop;

  return v_case_id;
end;$$;

revoke all on function public.create_return_case(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_return_case(uuid,uuid,text,text,text,jsonb) to service_role;
