-- Shoperation Email Builder: tenant-scoped reusable custom blocks.

create table if not exists public.email_saved_blocks (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  block_type text not null check (block_type in ('header','heading','text','button','divider','spacer','order-items','order-summary','payment-info','address','footer')),
  schema_version integer not null default 1 check (schema_version = 1),
  block jsonb not null check (
    jsonb_typeof(block)='object'
    and jsonb_typeof(block->'content')='object'
    and jsonb_typeof(block->'style')='object'
    and jsonb_typeof(block->'responsive')='object'
    and block->>'type'=block_type
    and block->>'version'=schema_version::text
  ),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,instance_id)
);

create index if not exists email_saved_blocks_instance_idx on public.email_saved_blocks(instance_id,updated_at desc);
create index if not exists email_saved_blocks_created_by_idx on public.email_saved_blocks(created_by) where created_by is not null;
create index if not exists email_saved_blocks_updated_by_idx on public.email_saved_blocks(updated_by) where updated_by is not null;

drop trigger if exists email_saved_blocks_touch_updated_at on public.email_saved_blocks;
create trigger email_saved_blocks_touch_updated_at
before update on public.email_saved_blocks
for each row execute function private.email_builder_touch_updated_at();

alter table public.email_saved_blocks enable row level security;
revoke all on table public.email_saved_blocks from anon,authenticated;
grant select on table public.email_saved_blocks to authenticated;
grant all on table public.email_saved_blocks to service_role;

drop policy if exists email_saved_blocks_store_read on public.email_saved_blocks;
create policy email_saved_blocks_store_read on public.email_saved_blocks
for select to authenticated using (public.can_read_store(instance_id));

create or replace function public.save_email_saved_block_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_name text,
  p_block jsonb
) returns uuid
language plpgsql
security invoker
set search_path=public,private
as $$
declare
  v_id uuid;
  v_org uuid;
  v_type text;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then
    raise exception 'EMAIL_BUILDER_FORBIDDEN';
  end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 120 then
    raise exception 'EMAIL_SAVED_BLOCK_NAME_INVALID';
  end if;
  if jsonb_typeof(p_block)<>'object' then raise exception 'EMAIL_SAVED_BLOCK_INVALID'; end if;
  v_type=p_block->>'type';
  if v_type not in ('header','heading','text','button','divider','spacer','order-items','order-summary','payment-info','address','footer') then
    raise exception 'EMAIL_SAVED_BLOCK_TYPE_INVALID';
  end if;
  if p_block->>'version'<>'1'
    or jsonb_typeof(p_block->'content')<>'object'
    or jsonb_typeof(p_block->'style')<>'object'
    or jsonb_typeof(p_block->'responsive')<>'object' then
    raise exception 'EMAIL_SAVED_BLOCK_INVALID';
  end if;

  insert into public.email_saved_blocks(instance_id,name,block_type,schema_version,block,created_by,updated_by)
  values(p_instance_id,trim(p_name),v_type,1,p_block,p_actor,p_actor)
  returning id into v_id;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(
    p_actor,'email.saved_block_created','email_saved_block',v_id::text,v_org,p_instance_id,
    'E-mail saját blokk mentve.',
    jsonb_build_object('name',trim(p_name),'block_type',v_type,'schema_version',1),
    jsonb_build_object('audit_source','email_builder')
  );
  return v_id;
end $$;

create or replace function public.delete_email_saved_block_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_saved_block_id uuid
) returns boolean
language plpgsql
security invoker
set search_path=public,private
as $$
declare
  v_org uuid;
  v_before jsonb;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then
    raise exception 'EMAIL_BUILDER_FORBIDDEN';
  end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select jsonb_build_object('name',name,'block_type',block_type,'schema_version',schema_version)
  into v_before
  from public.email_saved_blocks
  where id=p_saved_block_id and instance_id=p_instance_id
  for update;
  if v_before is null then raise exception 'EMAIL_SAVED_BLOCK_NOT_FOUND'; end if;

  delete from public.email_saved_blocks where id=p_saved_block_id and instance_id=p_instance_id;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,metadata)
  values(
    p_actor,'email.saved_block_deleted','email_saved_block',p_saved_block_id::text,v_org,p_instance_id,
    'E-mail saját blokk törölve.',v_before,jsonb_build_object('audit_source','email_builder')
  );
  return true;
end $$;

revoke all on function public.save_email_saved_block_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.delete_email_saved_block_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_email_saved_block_v1(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.delete_email_saved_block_v1(uuid,uuid,uuid) to service_role;
