-- Visual Builder Fidelity: tenant-owned Merchant Saved Blocks / Reusable Sections v1.
-- Saved blocks store canonical Page Schema fragments only. They have no renderer,
-- publish authority, template authority or business-data mutation capability.

create table if not exists public.storefront_saved_blocks (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80 and name=btrim(name)),
  component_key text not null check (component_key ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  component_version integer not null check (component_version >= 1),
  fragment jsonb not null check (jsonb_typeof(fragment)='object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,id)
);

create table if not exists public.storefront_saved_block_events (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  block_id uuid not null,
  event_type text not null check (event_type in ('created','deleted')),
  operation_key text not null check (operation_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  unique(instance_id,operation_key)
);

create index if not exists storefront_saved_blocks_instance_updated_idx
  on public.storefront_saved_blocks(instance_id,updated_at desc);
create index if not exists storefront_saved_block_events_history_idx
  on public.storefront_saved_block_events(instance_id,created_at desc);

alter table public.storefront_saved_blocks enable row level security;
alter table public.storefront_saved_block_events enable row level security;

-- Browser roles have no direct access. Application server code performs tenant/RBAC
-- checks first; mutations then pass a second database-level can_manage_storefront gate.
revoke all on public.storefront_saved_blocks from public,anon,authenticated;
revoke all on public.storefront_saved_block_events from public,anon,authenticated;
revoke insert,update,delete on public.storefront_saved_blocks from service_role;
revoke insert,update,delete on public.storefront_saved_block_events from service_role;
grant select on public.storefront_saved_blocks to service_role;
grant select on public.storefront_saved_block_events to service_role;

drop trigger if exists storefront_saved_block_events_immutable_trg on public.storefront_saved_block_events;
create trigger storefront_saved_block_events_immutable_trg
before update or delete on public.storefront_saved_block_events
for each row execute function public.storefront_events_immutable();

create or replace function public.save_storefront_saved_block_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_name text,
  p_component_key text,
  p_component_version integer,
  p_fragment jsonb,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_block public.storefront_saved_blocks%rowtype;
  v_event public.storefront_saved_block_events%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_name is null or p_name<>btrim(p_name) or char_length(p_name)<1 or char_length(p_name)>80 then raise exception 'STOREFRONT_SAVED_BLOCK_NAME_INVALID'; end if;
  if p_component_key is null or p_component_key !~ '^[a-z0-9]+([.-][a-z0-9]+)*$' then raise exception 'STOREFRONT_SAVED_BLOCK_COMPONENT_KEY_INVALID'; end if;
  if p_component_version is null or p_component_version<1 then raise exception 'STOREFRONT_SAVED_BLOCK_COMPONENT_VERSION_INVALID'; end if;
  if p_fragment is null or jsonb_typeof(p_fragment)<>'object' or pg_catalog.octet_length(p_fragment::text)>262144 then raise exception 'STOREFRONT_SAVED_BLOCK_FRAGMENT_INVALID'; end if;
  if coalesce(p_fragment->>'componentKey','')<>p_component_key then raise exception 'STOREFRONT_SAVED_BLOCK_COMPONENT_KEY_MISMATCH'; end if;
  if coalesce(p_fragment->>'componentVersion','') !~ '^[0-9]+$' or (p_fragment->>'componentVersion')::integer<>p_component_version then raise exception 'STOREFRONT_SAVED_BLOCK_COMPONENT_VERSION_MISMATCH'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_event from public.storefront_saved_block_events
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'created' then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object(
      'id',v_event.block_id,
      'name',v_event.metadata->>'name',
      'componentKey',v_event.metadata->>'componentKey',
      'componentVersion',(v_event.metadata->>'componentVersion')::integer,
      'createdAt',v_event.metadata->>'createdAt',
      'updatedAt',v_event.metadata->>'createdAt',
      'replayed',true
    );
  end if;

  insert into public.storefront_saved_blocks(
    instance_id,name,component_key,component_version,fragment,created_by
  ) values(
    p_instance_id,p_name,p_component_key,p_component_version,p_fragment,p_actor_user_id
  ) returning * into v_block;

  insert into public.storefront_saved_block_events(
    instance_id,block_id,event_type,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,v_block.id,'created',p_operation_key,p_actor_user_id,
    jsonb_build_object('name',v_block.name,'componentKey',v_block.component_key,'componentVersion',v_block.component_version,'createdAt',v_block.created_at)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.saved_block_created','storefront_saved_block',v_block.id::text,v_org,p_instance_id,
    'Storefront mentett blokk létrehozva',
    jsonb_build_object('name',v_block.name,'componentKey',v_block.component_key,'componentVersion',v_block.component_version),
    jsonb_build_object('audit_source','database_rpc','rpc','save_storefront_saved_block_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object(
    'id',v_block.id,'name',v_block.name,'componentKey',v_block.component_key,
    'componentVersion',v_block.component_version,'createdAt',v_block.created_at,
    'updatedAt',v_block.updated_at,'replayed',false
  );
end;
$$;

create or replace function public.delete_storefront_saved_block_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_block_id uuid,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_block public.storefront_saved_blocks%rowtype;
  v_event public.storefront_saved_block_events%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_block_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_event from public.storefront_saved_block_events
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'deleted' or v_event.block_id<>p_block_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object('id',p_block_id,'replayed',true);
  end if;

  select * into v_block from public.storefront_saved_blocks
  where id=p_block_id and instance_id=p_instance_id for update;
  if not found then raise exception 'STOREFRONT_SAVED_BLOCK_NOT_FOUND'; end if;

  insert into public.storefront_saved_block_events(
    instance_id,block_id,event_type,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,v_block.id,'deleted',p_operation_key,p_actor_user_id,
    jsonb_build_object('name',v_block.name,'componentKey',v_block.component_key,'componentVersion',v_block.component_version)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,metadata
  ) values(
    p_actor_user_id,'storefront.saved_block_deleted','storefront_saved_block',v_block.id::text,v_org,p_instance_id,
    'Storefront mentett blokk törölve',
    jsonb_build_object('name',v_block.name,'componentKey',v_block.component_key,'componentVersion',v_block.component_version),
    jsonb_build_object('audit_source','database_rpc','rpc','delete_storefront_saved_block_v1','operationKey',p_operation_key)
  );

  delete from public.storefront_saved_blocks where id=p_block_id and instance_id=p_instance_id;
  return jsonb_build_object('id',p_block_id,'replayed',false);
end;
$$;

revoke all on function public.save_storefront_saved_block_v1(uuid,uuid,text,text,integer,jsonb,text)
from public,anon,authenticated;
revoke all on function public.delete_storefront_saved_block_v1(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.save_storefront_saved_block_v1(uuid,uuid,text,text,integer,jsonb,text)
to service_role;
grant execute on function public.delete_storefront_saved_block_v1(uuid,uuid,uuid,text)
to service_role;

comment on table public.storefront_saved_blocks is 'Tenant-owned reusable canonical Page Schema fragments for Visual Builder. No render or publish authority.';
comment on table public.storefront_saved_block_events is 'Append-only audit/idempotency evidence for merchant Saved Block create/delete mutations.';
comment on function public.save_storefront_saved_block_v1(uuid,uuid,text,text,integer,jsonb,text) is 'Creates one tenant-scoped reusable storefront fragment after database-level manage permission verification.';
comment on function public.delete_storefront_saved_block_v1(uuid,uuid,uuid,text) is 'Deletes one tenant-scoped reusable storefront fragment while preserving append-only event and admin audit evidence.';
