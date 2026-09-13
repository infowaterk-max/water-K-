-- Merchant Saved Blocks v1 CRUD completion: optional metadata and tenant-scoped update/rename.
-- This remains a server-only mutation path and keeps Saved Blocks separate from templates/presets.

alter table public.storefront_saved_blocks
  add column if not exists description text check (description is null or (description=btrim(description) and char_length(description) between 1 and 500)),
  add column if not exists category text check (category is null or (category=btrim(category) and char_length(category) between 1 and 80));

alter table public.storefront_saved_block_events
  drop constraint if exists storefront_saved_block_events_event_type_check;
alter table public.storefront_saved_block_events
  add constraint storefront_saved_block_events_event_type_check
  check (event_type in ('created','updated','deleted'));

create or replace function public.update_storefront_saved_block_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_block_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before public.storefront_saved_blocks%rowtype;
  v_block public.storefront_saved_blocks%rowtype;
  v_event public.storefront_saved_block_events%rowtype;
  v_org uuid;
  v_description text;
  v_category text;
begin
  if p_instance_id is null or p_actor_user_id is null or p_block_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_name is null or p_name<>btrim(p_name) or char_length(p_name)<1 or char_length(p_name)>80 then raise exception 'STOREFRONT_SAVED_BLOCK_NAME_INVALID'; end if;

  v_description:=nullif(btrim(p_description),'');
  v_category:=nullif(btrim(p_category),'');
  if v_description is not null and char_length(v_description)>500 then raise exception 'STOREFRONT_SAVED_BLOCK_DESCRIPTION_INVALID'; end if;
  if v_category is not null and char_length(v_category)>80 then raise exception 'STOREFRONT_SAVED_BLOCK_CATEGORY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_event from public.storefront_saved_block_events
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'updated' or v_event.block_id<>p_block_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object(
      'id',v_event.block_id,
      'name',v_event.metadata->>'name',
      'description',v_event.metadata->'description',
      'category',v_event.metadata->'category',
      'componentKey',v_event.metadata->>'componentKey',
      'componentVersion',(v_event.metadata->>'componentVersion')::integer,
      'createdAt',v_event.metadata->>'createdAt',
      'updatedAt',v_event.metadata->>'updatedAt',
      'replayed',true
    );
  end if;

  select * into v_before from public.storefront_saved_blocks
  where id=p_block_id and instance_id=p_instance_id for update;
  if not found then raise exception 'STOREFRONT_SAVED_BLOCK_NOT_FOUND'; end if;

  update public.storefront_saved_blocks
  set name=p_name,description=v_description,category=v_category,updated_at=now()
  where id=p_block_id and instance_id=p_instance_id
  returning * into v_block;

  insert into public.storefront_saved_block_events(
    instance_id,block_id,event_type,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,v_block.id,'updated',p_operation_key,p_actor_user_id,
    jsonb_build_object(
      'name',v_block.name,
      'description',v_block.description,
      'category',v_block.category,
      'componentKey',v_block.component_key,
      'componentVersion',v_block.component_version,
      'createdAt',v_block.created_at,
      'updatedAt',v_block.updated_at
    )
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.saved_block_updated','storefront_saved_block',v_block.id::text,v_org,p_instance_id,
    'Storefront mentett blokk frissítve',
    jsonb_build_object('name',v_before.name,'description',v_before.description,'category',v_before.category),
    jsonb_build_object('name',v_block.name,'description',v_block.description,'category',v_block.category),
    jsonb_build_object('audit_source','database_rpc','rpc','update_storefront_saved_block_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object(
    'id',v_block.id,'name',v_block.name,'description',v_block.description,'category',v_block.category,
    'componentKey',v_block.component_key,'componentVersion',v_block.component_version,
    'createdAt',v_block.created_at,'updatedAt',v_block.updated_at,'replayed',false
  );
end;
$$;

revoke all on function public.update_storefront_saved_block_v1(uuid,uuid,uuid,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.update_storefront_saved_block_v1(uuid,uuid,uuid,text,text,text,text)
to service_role;

comment on table public.storefront_saved_block_events is 'Append-only audit/idempotency evidence for merchant Saved Block create/update/delete mutations.';
comment on function public.update_storefront_saved_block_v1(uuid,uuid,uuid,text,text,text,text) is 'Updates one tenant-scoped Saved Block name/metadata after database-level manage permission verification.';
