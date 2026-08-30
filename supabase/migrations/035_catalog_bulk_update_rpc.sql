create or replace function public.bulk_update_product_variants(p_changes jsonb, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  variant_id uuid;
  current_row public.product_variants%rowtype;
  new_stock integer;
  new_gross integer;
  new_net integer;
  new_active boolean;
  results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_changes) <> 'array' then raise exception 'p_changes must be an array'; end if;
  if jsonb_array_length(p_changes) > 500 then raise exception 'too many changes'; end if;
  for item in select value from jsonb_array_elements(p_changes)
  loop
    variant_id := (item->>'id')::uuid;
    select * into current_row from public.product_variants where id = variant_id for update;
    if not found then raise exception 'variant not found: %', variant_id; end if;
    new_stock := case when item ? 'stock' then (item->>'stock')::integer else current_row.stock_quantity end;
    new_gross := case when item ? 'grossPrice' then (item->>'grossPrice')::integer else current_row.gross_price_huf end;
    new_net := case when item ? 'netPrice' then (item->>'netPrice')::integer else current_row.net_price_huf end;
    new_active := case when item ? 'active' then (item->>'active')::boolean else current_row.active end;
    if new_stock < 0 or new_stock > 100000 then raise exception 'invalid stock for %', variant_id; end if;
    if new_gross < 0 or new_gross > 10000000 then raise exception 'invalid gross price for %', variant_id; end if;
    if new_net < 0 or new_net > 10000000 then raise exception 'invalid net price for %', variant_id; end if;
    update public.product_variants set stock_quantity=new_stock,gross_price_huf=new_gross,net_price_huf=new_net,active=new_active,updated_at=now() where id=variant_id;
    if new_stock <> current_row.stock_quantity then
      insert into public.inventory_events(variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
      values(variant_id,new_stock-current_row.stock_quantity,current_row.stock_quantity,new_stock,'bulk_admin_adjustment',p_actor,jsonb_build_object('sku',current_row.sku));
    end if;
    results := results || jsonb_build_array(jsonb_build_object('id',variant_id,'sku',current_row.sku,'before',jsonb_build_object('stock',current_row.stock_quantity,'grossPrice',current_row.gross_price_huf,'netPrice',current_row.net_price_huf,'active',current_row.active),'after',jsonb_build_object('stock',new_stock,'grossPrice',new_gross,'netPrice',new_net,'active',new_active)));
  end loop;
  return results;
end;
$$;
revoke all on function public.bulk_update_product_variants(jsonb,uuid) from public, anon, authenticated;
grant execute on function public.bulk_update_product_variants(jsonb,uuid) to service_role;
