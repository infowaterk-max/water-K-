-- BUG-002: merchant-controlled B2B sales channel with fail-closed storefront and checkout enforcement.
-- Reuses the existing webshop_sales_channels and product_channel_settings model.

create or replace function public.admin_mutate_sales_channel_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_channel text;
  v_enabled boolean;
  v_product_id uuid;
  v_product_name text;
  v_visible boolean;
  v_before jsonb;
  v_after jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'SALES_CHANNEL_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'SALES_CHANNEL_PAYLOAD_REQUIRED'; end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  v_channel:=lower(trim(coalesce(p_payload->>'channel','')));
  if v_channel<>'b2b' then raise exception 'SALES_CHANNEL_ONLY_B2B_MANAGEABLE'; end if;

  if p_action='set_channel_enabled' then
    if not (p_payload ? 'enabled') then raise exception 'SALES_CHANNEL_ENABLED_REQUIRED'; end if;
    v_enabled:=(p_payload->>'enabled')::boolean;

    select to_jsonb(sc) into v_before
    from public.webshop_sales_channels sc
    where sc.instance_id=p_instance_id and sc.channel_code=v_channel
    for update;

    insert into public.webshop_sales_channels(instance_id,channel_code,enabled,updated_at)
    values(p_instance_id,v_channel,v_enabled,now())
    on conflict(instance_id,channel_code) do update
      set enabled=excluded.enabled,updated_at=excluded.updated_at;

    select to_jsonb(sc) into v_after
    from public.webshop_sales_channels sc
    where sc.instance_id=p_instance_id and sc.channel_code=v_channel;
    if v_after is null then raise exception 'SALES_CHANNEL_WRITE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'catalog.sales_channel_updated','sales_channel',p_instance_id::text||':'||v_channel,
      v_org,p_instance_id,
      'B2B értékesítési csatorna '||case when v_enabled then 'bekapcsolva' else 'kikapcsolva' end,
      v_before,v_after,
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_sales_channel_v1')
    );

    return jsonb_build_object('channel',v_channel,'enabled',v_enabled);
  end if;

  if p_action='set_product_visibility' then
    if not (p_payload ? 'productId') or not (p_payload ? 'visible') then raise exception 'SALES_CHANNEL_PRODUCT_PAYLOAD_REQUIRED'; end if;
    begin
      v_product_id:=(p_payload->>'productId')::uuid;
      v_visible:=(p_payload->>'visible')::boolean;
    exception when others then
      raise exception 'SALES_CHANNEL_PRODUCT_PAYLOAD_INVALID';
    end;

    select p.name into v_product_name
    from public.products p
    where p.id=v_product_id and p.instance_id=p_instance_id;
    if not found then raise exception 'SALES_CHANNEL_PRODUCT_NOT_FOUND'; end if;

    select to_jsonb(pcs) into v_before
    from public.product_channel_settings pcs
    where pcs.instance_id=p_instance_id and pcs.product_id=v_product_id and pcs.channel_code=v_channel
    for update;

    insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,updated_at)
    values(p_instance_id,v_product_id,v_channel,v_visible,now())
    on conflict(instance_id,product_id,channel_code) do update
      set visible=excluded.visible,updated_at=excluded.updated_at;

    select to_jsonb(pcs) into v_after
    from public.product_channel_settings pcs
    where pcs.instance_id=p_instance_id and pcs.product_id=v_product_id and pcs.channel_code=v_channel;
    if v_after is null then raise exception 'SALES_CHANNEL_PRODUCT_WRITE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'catalog.product_channel_visibility_updated','product_channel',v_product_id::text||':'||v_channel,
      v_org,p_instance_id,
      left(v_product_name||' B2B láthatóság módosítva',500),
      v_before,v_after,
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_sales_channel_v1','productId',v_product_id)
    );

    return jsonb_build_object('channel',v_channel,'productId',v_product_id,'visible',v_visible);
  end if;

  raise exception 'SALES_CHANNEL_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_sales_channel_v1(uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_sales_channel_v1(uuid,uuid,text,jsonb)
to service_role;

comment on function public.admin_mutate_sales_channel_v1(uuid,uuid,text,jsonb)
is 'Atomic tenant-scoped B2B channel and product visibility mutation with admin audit evidence.';

-- The existing checkout routines already own B2C/B2B pricing, visibility, MOQ and order-multiple authority.
-- Patch only channel selection and B2B missing-setting behavior so the new global B2B switch is authoritative.
do $b2b_enforcement$
declare
  v_def text;
  v_old_role text:=$old_role$if v_role='reseller' and v_reseller then v_channel:='b2b';end if;$old_role$;
  v_new_role text:=$new_role$if v_role='reseller' and v_reseller and coalesce((select sc.enabled from public.webshop_sales_channels sc where sc.instance_id=p_instance_id and sc.channel_code='b2b'),false) then v_channel:='b2b';end if;$new_role$;
  v_old_visibility text:=$old_visibility$if v_has_channel then if not coalesce(v_channel_visible,true) then raise exception 'A termék ezen az értékesítési csatornán nem elérhető.';end if;elsif coalesce(v_variant.product_audience,'retail')='professional' and v_channel<>'b2b' then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;$old_visibility$;
  v_new_visibility text:=$new_visibility$if v_channel='b2b' and not v_has_channel then raise exception 'A termék B2B csatornán nincs engedélyezve.';end if;if v_has_channel then if not coalesce(v_channel_visible,true) then raise exception 'A termék ezen az értékesítési csatornán nem elérhető.';end if;elsif coalesce(v_variant.product_audience,'retail')='professional' and v_channel<>'b2b' then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;$new_visibility$;
begin
  select pg_get_functiondef('public.quote_tenant_checkout_v2(uuid,uuid,text,text,integer,integer,jsonb)'::regprocedure) into v_def;
  if strpos(v_def,v_new_role)=0 then
    if strpos(v_def,v_old_role)=0 then raise exception 'B2B_QUOTE_ROLE_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_role,v_new_role);
  end if;
  if strpos(v_def,v_new_visibility)=0 then
    if strpos(v_def,v_old_visibility)=0 then raise exception 'B2B_QUOTE_VISIBILITY_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_visibility,v_new_visibility);
  end if;
  execute v_def;

  select pg_get_functiondef('public.place_order_provider_v5_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb)'::regprocedure) into v_def;
  if strpos(v_def,v_new_role)=0 then
    if strpos(v_def,v_old_role)=0 then raise exception 'B2B_ORDER_ROLE_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_role,v_new_role);
  end if;
  if strpos(v_def,v_new_visibility)=0 then
    if strpos(v_def,v_old_visibility)=0 then raise exception 'B2B_ORDER_VISIBILITY_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_visibility,v_new_visibility);
  end if;
  execute v_def;
end;
$b2b_enforcement$;

revoke all on function public.quote_tenant_checkout_v2(uuid,uuid,text,text,integer,integer,jsonb)
from public,anon,authenticated;
grant execute on function public.quote_tenant_checkout_v2(uuid,uuid,text,text,integer,integer,jsonb)
to service_role;

revoke all on function public.place_order_provider_v5_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.place_order_provider_v5_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb)
to service_role;
