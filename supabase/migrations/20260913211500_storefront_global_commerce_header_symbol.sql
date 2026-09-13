-- Visual Builder fidelity recovery: allow the shared commerce header family to
-- occupy the canonical global header slot. This is a forward-only relaxation of
-- the existing reusable-symbol guard; all tenant, permission, replay and audit
-- semantics remain unchanged.

create or replace function public.update_storefront_reusable_symbol_v1(
  p_instance_id uuid,p_actor_user_id uuid,p_symbol_id uuid,p_name text,p_component_key text,
  p_component_version integer,p_fragment jsonb,p_operation_key text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_symbol public.storefront_reusable_symbols%rowtype;
  v_event public.storefront_reusable_symbol_events%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_symbol_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_name is null or p_name<>btrim(p_name) or char_length(p_name)<1 or char_length(p_name)>80 then raise exception 'STOREFRONT_SYMBOL_NAME_INVALID'; end if;
  if p_component_key is null or p_component_key !~ '^[a-z0-9]+([.-][a-z0-9]+)*$' then raise exception 'STOREFRONT_SYMBOL_COMPONENT_KEY_INVALID'; end if;
  if p_component_version is null or p_component_version<1 then raise exception 'STOREFRONT_SYMBOL_COMPONENT_VERSION_INVALID'; end if;
  if p_fragment is null or jsonb_typeof(p_fragment)<>'object' or pg_catalog.octet_length(p_fragment::text)>262144 then raise exception 'STOREFRONT_SYMBOL_FRAGMENT_INVALID'; end if;
  if coalesce(p_fragment->>'componentKey','')<>p_component_key then raise exception 'STOREFRONT_SYMBOL_COMPONENT_KEY_MISMATCH'; end if;
  if coalesce(p_fragment->>'componentVersion','') !~ '^[0-9]+$' or (p_fragment->>'componentVersion')::integer<>p_component_version then raise exception 'STOREFRONT_SYMBOL_COMPONENT_VERSION_MISMATCH'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_event from public.storefront_reusable_symbol_events where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'updated' or v_event.symbol_id<>p_symbol_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id;
    if not found then raise exception 'STOREFRONT_SYMBOL_REPLAY_TARGET_MISSING'; end if;
    return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',true);
  end if;

  select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id for update;
  if not found then raise exception 'STOREFRONT_SYMBOL_NOT_FOUND'; end if;
  if v_symbol.global_slot='header' and p_component_key not in ('system.header','system.commerce-header') then raise exception 'STOREFRONT_GLOBAL_HEADER_INVALID'; end if;
  if v_symbol.global_slot='footer' and p_component_key<>'layout.section' then raise exception 'STOREFRONT_GLOBAL_FOOTER_INVALID'; end if;
  update public.storefront_reusable_symbols set name=p_name,component_key=p_component_key,component_version=p_component_version,fragment=p_fragment,revision=revision+1,updated_by=p_actor_user_id,updated_at=now()
  where instance_id=p_instance_id and id=p_symbol_id returning * into v_symbol;
  insert into public.storefront_reusable_symbol_events(instance_id,symbol_id,event_type,operation_key,actor_user_id,metadata)
  values(p_instance_id,v_symbol.id,'updated',p_operation_key,p_actor_user_id,jsonb_build_object('name',v_symbol.name,'revision',v_symbol.revision));
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor_user_id,'storefront.reusable_symbol_updated','storefront_reusable_symbol',v_symbol.id::text,v_org,p_instance_id,'Storefront reusable symbol frissítve',jsonb_build_object('name',v_symbol.name,'componentKey',v_symbol.component_key,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot),jsonb_build_object('audit_source','database_rpc','rpc','update_storefront_reusable_symbol_v1','operationKey',p_operation_key));
  return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',false);
end;
$$;

create or replace function public.set_storefront_reusable_symbol_global_slot_v1(
  p_instance_id uuid,p_actor_user_id uuid,p_symbol_id uuid,p_global_slot text,p_operation_key text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_symbol public.storefront_reusable_symbols%rowtype;
  v_event public.storefront_reusable_symbol_events%rowtype;
  v_org uuid;
  v_displaced_id uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_symbol_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_global_slot is not null and p_global_slot not in ('header','footer') then raise exception 'STOREFRONT_GLOBAL_SLOT_INVALID'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_event from public.storefront_reusable_symbol_events where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'global_slot' or v_event.symbol_id<>p_symbol_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id;
    if not found then raise exception 'STOREFRONT_SYMBOL_REPLAY_TARGET_MISSING'; end if;
    return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',true);
  end if;
  select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id for update;
  if not found then raise exception 'STOREFRONT_SYMBOL_NOT_FOUND'; end if;
  if p_global_slot='header' and v_symbol.component_key not in ('system.header','system.commerce-header') then raise exception 'STOREFRONT_GLOBAL_HEADER_INVALID'; end if;
  if p_global_slot='footer' and v_symbol.component_key<>'layout.section' then raise exception 'STOREFRONT_GLOBAL_FOOTER_INVALID'; end if;
  if p_global_slot is not null then
    select id into v_displaced_id from public.storefront_reusable_symbols
    where instance_id=p_instance_id and global_slot=p_global_slot and id<>p_symbol_id for update;
    update public.storefront_reusable_symbols set global_slot=null,updated_by=p_actor_user_id,updated_at=now()
    where instance_id=p_instance_id and global_slot=p_global_slot and id<>p_symbol_id;
  end if;
  update public.storefront_reusable_symbols set global_slot=p_global_slot,updated_by=p_actor_user_id,updated_at=now()
  where instance_id=p_instance_id and id=p_symbol_id returning * into v_symbol;
  insert into public.storefront_reusable_symbol_events(instance_id,symbol_id,event_type,operation_key,actor_user_id,metadata)
  values(p_instance_id,v_symbol.id,'global_slot',p_operation_key,p_actor_user_id,jsonb_build_object('globalSlot',v_symbol.global_slot,'revision',v_symbol.revision,'displacedSymbolId',v_displaced_id));
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor_user_id,'storefront.reusable_symbol_global_slot_changed','storefront_reusable_symbol',v_symbol.id::text,v_org,p_instance_id,'Storefront global symbol slot módosítva',jsonb_build_object('name',v_symbol.name,'globalSlot',v_symbol.global_slot,'revision',v_symbol.revision),jsonb_build_object('audit_source','database_rpc','rpc','set_storefront_reusable_symbol_global_slot_v1','operationKey',p_operation_key,'displacedSymbolId',v_displaced_id));
  return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',false);
end;
$$;

revoke all on function public.update_storefront_reusable_symbol_v1(uuid,uuid,uuid,text,text,integer,jsonb,text) from public,anon,authenticated;
revoke all on function public.set_storefront_reusable_symbol_global_slot_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.update_storefront_reusable_symbol_v1(uuid,uuid,uuid,text,text,integer,jsonb,text) to service_role;
grant execute on function public.set_storefront_reusable_symbol_global_slot_v1(uuid,uuid,uuid,text,text) to service_role;

comment on function public.set_storefront_reusable_symbol_global_slot_v1(uuid,uuid,uuid,text,text) is 'Assigns the canonical global header/footer slot; header accepts system.header and system.commerce-header.';
