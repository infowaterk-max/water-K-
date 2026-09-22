create unique index if not exists suppliers_name_unique_ci on public.suppliers ((lower(trim(name))));

create or replace function public.create_purchase_order(
  p_order_number text,
  p_supplier_name text,
  p_payment_terms_days integer,
  p_expected_at date,
  p_payment_due_at date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_supplier_id uuid;
  v_supplier_name text;
  v_id uuid;
  v_total numeric(14,2);
  v_item jsonb;
  v_variant uuid;
  v_quantity integer;
  v_cost numeric(12,2);
begin
  v_supplier_name := trim(p_supplier_name);
  if length(v_supplier_name) < 2 then raise exception 'Érvénytelen beszállítónév.'; end if;
  if p_payment_terms_days < 0 or p_payment_terms_days > 365 then raise exception 'Érvénytelen fizetési határidő.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'A beszerzéshez legalább egy tétel szükséges.'; end if;

  select id into v_supplier_id from public.suppliers where lower(trim(name))=lower(v_supplier_name) limit 1;
  if v_supplier_id is null then
    insert into public.suppliers(name,payment_terms_days)
    values(v_supplier_name,p_payment_terms_days)
    on conflict ((lower(trim(name)))) do update set updated_at=now()
    returning id into v_supplier_id;
  end if;

  select coalesce(sum((x->>'quantity')::integer * (x->>'unitCostNetHuf')::numeric),0)
  into v_total from jsonb_array_elements(p_items) x;
  if v_total < 0 then raise exception 'Érvénytelen beszerzési összeg.'; end if;

  insert into public.purchase_orders(order_number,supplier_id,status,expected_at,payment_due_at,net_total_huf,notes,created_by)
  values(p_order_number,v_supplier_id,'draft',p_expected_at,p_payment_due_at,v_total,p_notes,p_created_by)
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_variant := (v_item->>'variantId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_cost := (v_item->>'unitCostNetHuf')::numeric;
    if v_quantity <= 0 or v_cost < 0 then raise exception 'Érvénytelen beszerzési tétel.'; end if;
    perform 1 from public.product_variants where id=v_variant;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;
    insert into public.purchase_order_items(purchase_order_id,variant_id,quantity,unit_cost_net_huf)
    values(v_id,v_variant,v_quantity,v_cost);
  end loop;

  return jsonb_build_object('id',v_id,'supplierId',v_supplier_id,'supplierName',v_supplier_name,'netTotal',v_total);
end;$$;
revoke all on function public.create_purchase_order(text,text,integer,date,date,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_purchase_order(text,text,integer,date,date,text,uuid,jsonb) to service_role;

drop function if exists public.create_purchase_order(text,uuid,date,date,text,uuid,jsonb);
