-- Atomic, tenant-scoped single-variant admin update.
-- Variant state, inventory evidence and admin audit succeed or roll back together.

create or replace function public.admin_update_product_variant_v2(
  p_instance_id uuid,
  p_variant_id uuid,
  p_actor uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.product_variants%rowtype;
  updated_row public.product_variants%rowtype;
  v_org uuid;
  v_stock integer;
  v_gross integer;
  v_net integer;
  v_reseller_gross integer;
  v_reseller_net integer;
  v_unit_cost integer;
  v_weight integer;
  v_lead integer;
  v_safety integer;
  v_moq integer;
  v_multiple integer;
  v_active boolean;
begin
  if p_instance_id is null or p_variant_id is null or p_actor is null then
    raise exception 'VARIANT_UPDATE_IDENTITY_REQUIRED';
  end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then
    raise exception 'VARIANT_UPDATE_PATCH_REQUIRED';
  end if;
  if exists(
    select 1
    from jsonb_object_keys(p_patch) as k(key)
    where k.key not in (
      'stock','grossPrice','netPrice','resellerGrossPrice','resellerNetPrice',
      'unitCostNet','weightGrams','supplierLeadTimeDays','safetyStockDays',
      'minimumOrderQuantity','orderMultiple','active'
    )
  ) then
    raise exception 'VARIANT_UPDATE_FIELD_NOT_ALLOWED';
  end if;

  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'CATALOG_PERMISSION_REQUIRED';
  end if;

  select w.organization_id
    into v_org
    from public.webshop_instances w
   where w.id=p_instance_id;
  if v_org is null then
    raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';
  end if;

  select *
    into current_row
    from public.product_variants
   where id=p_variant_id
     and instance_id=p_instance_id
   for update;
  if not found then
    raise exception 'VARIANT_NOT_FOUND';
  end if;

  if p_expected_updated_at is not null
     and current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_VARIANT';
  end if;

  v_stock:=case when p_patch ? 'stock' then (p_patch->>'stock')::integer else current_row.stock_quantity end;
  v_gross:=case when p_patch ? 'grossPrice' then (p_patch->>'grossPrice')::integer else current_row.gross_price_huf end;
  v_net:=case when p_patch ? 'netPrice' then (p_patch->>'netPrice')::integer else current_row.net_price_huf end;
  v_reseller_gross:=case when p_patch ? 'resellerGrossPrice' then (p_patch->>'resellerGrossPrice')::integer else current_row.reseller_gross_price_huf end;
  v_reseller_net:=case when p_patch ? 'resellerNetPrice' then (p_patch->>'resellerNetPrice')::integer else current_row.reseller_net_price_huf end;
  v_unit_cost:=case when p_patch ? 'unitCostNet' then (p_patch->>'unitCostNet')::integer else current_row.unit_cost_net_huf end;
  v_weight:=case when p_patch ? 'weightGrams' then (p_patch->>'weightGrams')::integer else current_row.weight_grams end;
  v_lead:=case when p_patch ? 'supplierLeadTimeDays' then (p_patch->>'supplierLeadTimeDays')::integer else current_row.supplier_lead_time_days end;
  v_safety:=case when p_patch ? 'safetyStockDays' then (p_patch->>'safetyStockDays')::integer else current_row.safety_stock_days end;
  v_moq:=case when p_patch ? 'minimumOrderQuantity' then (p_patch->>'minimumOrderQuantity')::integer else current_row.minimum_order_quantity end;
  v_multiple:=case when p_patch ? 'orderMultiple' then (p_patch->>'orderMultiple')::integer else current_row.order_multiple end;
  v_active:=case when p_patch ? 'active' then (p_patch->>'active')::boolean else current_row.active end;

  if v_stock is null or v_stock<0 or v_stock>100000 then raise exception 'INVALID_STOCK'; end if;
  if v_gross is null or v_gross<0 or v_gross>10000000 then raise exception 'INVALID_GROSS_PRICE'; end if;
  if v_net is null or v_net<0 or v_net>10000000 then raise exception 'INVALID_NET_PRICE'; end if;
  if v_reseller_gross is not null and (v_reseller_gross<0 or v_reseller_gross>10000000) then raise exception 'INVALID_RESELLER_GROSS_PRICE'; end if;
  if v_reseller_net is not null and (v_reseller_net<0 or v_reseller_net>10000000) then raise exception 'INVALID_RESELLER_NET_PRICE'; end if;
  if v_unit_cost is not null and (v_unit_cost<0 or v_unit_cost>10000000) then raise exception 'INVALID_UNIT_COST'; end if;
  if v_weight is not null and (v_weight<1 or v_weight>100000000) then raise exception 'INVALID_WEIGHT'; end if;
  if v_lead is null or v_lead<0 or v_lead>365 then raise exception 'INVALID_LEAD_TIME'; end if;
  if v_safety is null or v_safety<0 or v_safety>365 then raise exception 'INVALID_SAFETY_STOCK'; end if;
  if v_moq is null or v_moq<1 or v_moq>100000 then raise exception 'INVALID_MOQ'; end if;
  if v_multiple is null or v_multiple<1 or v_multiple>100000 then raise exception 'INVALID_ORDER_MULTIPLE'; end if;
  if v_active is null then raise exception 'INVALID_ACTIVE_STATE'; end if;

  update public.product_variants
     set stock_quantity=v_stock,
         gross_price_huf=v_gross,
         net_price_huf=v_net,
         reseller_gross_price_huf=v_reseller_gross,
         reseller_net_price_huf=v_reseller_net,
         unit_cost_net_huf=v_unit_cost,
         weight_grams=v_weight,
         supplier_lead_time_days=v_lead,
         safety_stock_days=v_safety,
         minimum_order_quantity=v_moq,
         order_multiple=v_multiple,
         active=v_active,
         updated_at=now()
   where id=p_variant_id
     and instance_id=p_instance_id
  returning * into updated_row;

  if updated_row.stock_quantity<>current_row.stock_quantity then
    insert into public.inventory_events(
      instance_id,variant_id,change_quantity,previous_stock,new_stock,
      reason,actor_user_id,metadata
    ) values(
      p_instance_id,p_variant_id,
      updated_row.stock_quantity-current_row.stock_quantity,
      current_row.stock_quantity,updated_row.stock_quantity,
      'admin_adjustment',p_actor,
      jsonb_build_object(
        'sku',current_row.sku,
        'previous_gross_price_huf',current_row.gross_price_huf,
        'new_gross_price_huf',updated_row.gross_price_huf,
        'source','admin_update_product_variant_v2'
      )
    );
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'catalog.variant_updated','product_variant',p_variant_id::text,
    v_org,p_instance_id,
    current_row.sku||' termékváltozat módosítva',
    to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc','patch',p_patch)
  );

  return jsonb_build_object(
    'id',p_variant_id,
    'sku',updated_row.sku,
    'before',to_jsonb(current_row),
    'after',to_jsonb(updated_row)
  );
end;
$$;

revoke all on function public.admin_update_product_variant_v2(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_update_product_variant_v2(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;

comment on function public.admin_update_product_variant_v2(uuid,uuid,uuid,timestamptz,jsonb)
is 'Atomic tenant-scoped single variant admin update with inventory evidence and audit logging.';
