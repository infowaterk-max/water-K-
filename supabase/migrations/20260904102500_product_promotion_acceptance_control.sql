-- BUG-004: merchant-controlled B2C promotion using the existing channel discount authority.
-- No parallel promotion model: checkout/storefront continue to use product_channel_settings.discount_percent.

create or replace function public.admin_set_product_promotion_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_product_id uuid,
  p_discount_percent numeric default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_product_name text;
  v_before jsonb;
  v_after public.product_channel_settings%rowtype;
begin
  if p_instance_id is null or p_actor is null or p_product_id is null then
    raise exception 'PRODUCT_PROMOTION_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'CATALOG_PERMISSION_REQUIRED';
  end if;
  if p_discount_percent is not null and (p_discount_percent<0 or p_discount_percent>100) then
    raise exception 'PRODUCT_PROMOTION_DISCOUNT_INVALID';
  end if;

  select w.organization_id,p.name
    into v_org,v_product_name
  from public.products p
  join public.webshop_instances w on w.id=p_instance_id
  where p.id=p_product_id and p.instance_id=p_instance_id;
  if not found then raise exception 'PRODUCT_PROMOTION_PRODUCT_NOT_FOUND'; end if;

  select to_jsonb(pcs) into v_before
  from public.product_channel_settings pcs
  where pcs.instance_id=p_instance_id
    and pcs.product_id=p_product_id
    and pcs.channel_code='b2c'
  for update;

  insert into public.product_channel_settings(
    instance_id,product_id,channel_code,visible,discount_percent,updated_at
  ) values(
    p_instance_id,p_product_id,'b2c',true,p_discount_percent,now()
  )
  on conflict(instance_id,product_id,channel_code) do update
    set discount_percent=excluded.discount_percent,
        updated_at=excluded.updated_at
  returning * into v_after;

  if v_after.product_id is null then raise exception 'PRODUCT_PROMOTION_WRITE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'catalog.product_promotion_updated','product_channel',p_product_id::text||':b2c',
    v_org,p_instance_id,
    left(v_product_name||case when p_discount_percent is null or p_discount_percent=0 then ' B2C akció törölve' else ' B2C akció beállítva: -'||p_discount_percent::text||'%' end,500),
    v_before,to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_set_product_promotion_v1','channel','b2c')
  );

  return jsonb_build_object(
    'productId',p_product_id,
    'channel','b2c',
    'discountPercent',v_after.discount_percent
  );
end;
$$;

revoke all on function public.admin_set_product_promotion_v1(uuid,uuid,uuid,numeric)
from public,anon,authenticated;
grant execute on function public.admin_set_product_promotion_v1(uuid,uuid,uuid,numeric)
to service_role;

comment on function public.admin_set_product_promotion_v1(uuid,uuid,uuid,numeric)
is 'Atomic tenant-scoped B2C product promotion mutation with audit evidence; uses product_channel_settings.discount_percent.';
