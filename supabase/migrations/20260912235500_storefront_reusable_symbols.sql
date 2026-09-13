-- Visual Builder Fidelity Engine: tenant-owned linked reusable symbols v1.
-- Symbols are canonical Page Schema fragments with explicit store-level global
-- header/footer assignment. Page drafts remain the only page publication authority.

create table if not exists public.storefront_reusable_symbols (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80 and name=btrim(name)),
  component_key text not null check (component_key ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  component_version integer not null check (component_version >= 1),
  fragment jsonb not null check (jsonb_typeof(fragment)='object'),
  revision integer not null default 1 check (revision >= 1),
  global_slot text check (global_slot is null or global_slot in ('header','footer')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,id)
);

create unique index if not exists storefront_reusable_symbols_global_slot_uidx
  on public.storefront_reusable_symbols(instance_id,global_slot)
  where global_slot is not null;
create index if not exists storefront_reusable_symbols_instance_updated_idx
  on public.storefront_reusable_symbols(instance_id,updated_at desc);
create index if not exists storefront_reusable_symbols_created_by_idx
  on public.storefront_reusable_symbols(created_by);
create index if not exists storefront_reusable_symbols_updated_by_idx
  on public.storefront_reusable_symbols(updated_by);

create table if not exists public.storefront_reusable_symbol_events (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  symbol_id uuid not null,
  event_type text not null check (event_type in ('created','updated','global_slot','deleted')),
  operation_key text not null check (operation_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  unique(instance_id,operation_key)
);
create index if not exists storefront_reusable_symbol_events_history_idx
  on public.storefront_reusable_symbol_events(instance_id,created_at desc);
create index if not exists storefront_reusable_symbol_events_actor_idx
  on public.storefront_reusable_symbol_events(actor_user_id);

alter table public.storefront_reusable_symbols enable row level security;
alter table public.storefront_reusable_symbol_events enable row level security;
revoke all on public.storefront_reusable_symbols from public,anon,authenticated;
revoke all on public.storefront_reusable_symbol_events from public,anon,authenticated;
revoke insert,update,delete on public.storefront_reusable_symbols from service_role;
revoke insert,update,delete on public.storefront_reusable_symbol_events from service_role;
grant select on public.storefront_reusable_symbols to service_role;
grant select on public.storefront_reusable_symbol_events to service_role;

drop trigger if exists storefront_reusable_symbol_events_immutable_trg on public.storefront_reusable_symbol_events;
create trigger storefront_reusable_symbol_events_immutable_trg
before update or delete on public.storefront_reusable_symbol_events
for each row execute function public.storefront_events_immutable();

create or replace function public.create_storefront_reusable_symbol_v1(
  p_instance_id uuid,p_actor_user_id uuid,p_name text,p_component_key text,
  p_component_version integer,p_fragment jsonb,p_operation_key text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_symbol public.storefront_reusable_symbols%rowtype;
  v_event public.storefront_reusable_symbol_events%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
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
    if v_event.event_type<>'created' then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=v_event.symbol_id;
    if not found then raise exception 'STOREFRONT_SYMBOL_REPLAY_TARGET_MISSING'; end if;
    return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',true);
  end if;

  insert into public.storefront_reusable_symbols(instance_id,name,component_key,component_version,fragment,created_by,updated_by)
  values(p_instance_id,p_name,p_component_key,p_component_version,p_fragment,p_actor_user_id,p_actor_user_id)
  returning * into v_symbol;
  insert into public.storefront_reusable_symbol_events(instance_id,symbol_id,event_type,operation_key,actor_user_id,metadata)
  values(p_instance_id,v_symbol.id,'created',p_operation_key,p_actor_user_id,jsonb_build_object('name',v_symbol.name,'revision',v_symbol.revision));
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor_user_id,'storefront.reusable_symbol_created','storefront_reusable_symbol',v_symbol.id::text,v_org,p_instance_id,'Storefront reusable symbol létrehozva',jsonb_build_object('name',v_symbol.name,'componentKey',v_symbol.component_key,'revision',v_symbol.revision),jsonb_build_object('audit_source','database_rpc','rpc','create_storefront_reusable_symbol_v1','operationKey',p_operation_key));
  return jsonb_build_object('id',v_symbol.id,'name',v_symbol.name,'componentKey',v_symbol.component_key,'componentVersion',v_symbol.component_version,'fragment',v_symbol.fragment,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot,'createdAt',v_symbol.created_at,'updatedAt',v_symbol.updated_at,'replayed',false);
end;
$$;

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
  if v_symbol.global_slot='header' and p_component_key<>'system.header' then raise exception 'STOREFRONT_GLOBAL_HEADER_INVALID'; end if;
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
  if p_global_slot='header' and v_symbol.component_key<>'system.header' then raise exception 'STOREFRONT_GLOBAL_HEADER_INVALID'; end if;
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

create or replace function public.delete_storefront_reusable_symbol_v1(
  p_instance_id uuid,p_actor_user_id uuid,p_symbol_id uuid,p_operation_key text
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
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_event from public.storefront_reusable_symbol_events where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_event.event_type<>'deleted' or v_event.symbol_id<>p_symbol_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object('id',p_symbol_id,'replayed',true);
  end if;
  select * into v_symbol from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id for update;
  if not found then raise exception 'STOREFRONT_SYMBOL_NOT_FOUND'; end if;
  insert into public.storefront_reusable_symbol_events(instance_id,symbol_id,event_type,operation_key,actor_user_id,metadata)
  values(p_instance_id,v_symbol.id,'deleted',p_operation_key,p_actor_user_id,jsonb_build_object('name',v_symbol.name,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot));
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,metadata)
  values(p_actor_user_id,'storefront.reusable_symbol_deleted','storefront_reusable_symbol',v_symbol.id::text,v_org,p_instance_id,'Storefront reusable symbol törölve',jsonb_build_object('name',v_symbol.name,'componentKey',v_symbol.component_key,'revision',v_symbol.revision,'globalSlot',v_symbol.global_slot),jsonb_build_object('audit_source','database_rpc','rpc','delete_storefront_reusable_symbol_v1','operationKey',p_operation_key));
  delete from public.storefront_reusable_symbols where instance_id=p_instance_id and id=p_symbol_id;
  return jsonb_build_object('id',p_symbol_id,'replayed',false);
end;
$$;

revoke all on function public.create_storefront_reusable_symbol_v1(uuid,uuid,text,text,integer,jsonb,text) from public,anon,authenticated;
revoke all on function public.update_storefront_reusable_symbol_v1(uuid,uuid,uuid,text,text,integer,jsonb,text) from public,anon,authenticated;
revoke all on function public.set_storefront_reusable_symbol_global_slot_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.delete_storefront_reusable_symbol_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_storefront_reusable_symbol_v1(uuid,uuid,text,text,integer,jsonb,text) to service_role;
grant execute on function public.update_storefront_reusable_symbol_v1(uuid,uuid,uuid,text,text,integer,jsonb,text) to service_role;
grant execute on function public.set_storefront_reusable_symbol_global_slot_v1(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.delete_storefront_reusable_symbol_v1(uuid,uuid,uuid,text) to service_role;

comment on table public.storefront_reusable_symbols is 'Tenant-owned canonical linked reusable Page Schema fragments with optional global header/footer assignment.';
comment on table public.storefront_reusable_symbol_events is 'Append-only idempotency and audit evidence for reusable symbol mutations.';
