-- Shoperation Email Builder Foundation B: tenant-scoped storage, immutable versions and atomic lifecycle RPCs.
create schema if not exists private;

create table if not exists public.email_brand_kits (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  is_default boolean not null default false,
  logo_url text,
  tokens jsonb not null default '{}'::jsonb check (jsonb_typeof(tokens)='object'),
  company_details jsonb not null default '{}'::jsonb check (jsonb_typeof(company_details)='object'),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links)='object'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,instance_id)
);
create unique index if not exists email_brand_kits_default_uidx on public.email_brand_kits(instance_id) where is_default;
create index if not exists email_brand_kits_instance_idx on public.email_brand_kits(instance_id,updated_at desc);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete restrict,
  template_key text not null check (template_key ~ '^[a-z0-9][a-z0-9._-]{1,159}$'),
  name text not null check (char_length(trim(name)) between 1 and 160),
  family text not null check (family in ('essential','commerce','campaign','editorial','minimal')),
  purpose text not null check (purpose in ('transactional','marketing')),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  brand_kit_id uuid,
  draft_schema_version integer not null check (draft_schema_version > 0),
  draft_document jsonb not null check (jsonb_typeof(draft_document)='object' and jsonb_typeof(draft_document->'schemaVersion')='number' and draft_document->>'schemaVersion'=draft_schema_version::text),
  active_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,template_key),
  unique(id,instance_id),
  constraint email_templates_brand_kit_tenant_fk foreign key(brand_kit_id,instance_id) references public.email_brand_kits(id,instance_id) on delete restrict
);
create index if not exists email_templates_instance_status_idx on public.email_templates(instance_id,status,updated_at desc);

create table if not exists public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  template_id uuid not null,
  version_number integer not null check (version_number > 0),
  schema_version integer not null check (schema_version > 0),
  document jsonb not null check (jsonb_typeof(document)='object' and jsonb_typeof(document->'schemaVersion')='number' and document->>'schemaVersion'=schema_version::text),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz not null default now(),
  constraint email_template_versions_template_fk foreign key(template_id,instance_id) references public.email_templates(id,instance_id) on delete restrict,
  unique(instance_id,template_id,version_number),
  unique(id,template_id,instance_id)
);
create index if not exists email_template_versions_template_idx on public.email_template_versions(instance_id,template_id,version_number desc);

alter table public.email_templates drop constraint if exists email_templates_active_version_fk;
alter table public.email_templates add constraint email_templates_active_version_fk
  foreign key(active_version_id,id,instance_id) references public.email_template_versions(id,template_id,instance_id) on delete restrict;

create or replace function private.email_builder_touch_updated_at() returns trigger
language plpgsql security invoker set search_path=public,private as $$
begin
  new.updated_at=now();
  return new;
end $$;
revoke all on function private.email_builder_touch_updated_at() from public,anon,authenticated;

drop trigger if exists email_brand_kits_touch_updated_at on public.email_brand_kits;
create trigger email_brand_kits_touch_updated_at before update on public.email_brand_kits for each row execute function private.email_builder_touch_updated_at();
drop trigger if exists email_templates_touch_updated_at on public.email_templates;
create trigger email_templates_touch_updated_at before update on public.email_templates for each row execute function private.email_builder_touch_updated_at();

create or replace function private.reject_email_template_version_mutation() returns trigger
language plpgsql security invoker set search_path=public,private as $$
begin
  raise exception 'EMAIL_TEMPLATE_VERSION_IMMUTABLE';
end $$;
revoke all on function private.reject_email_template_version_mutation() from public,anon,authenticated;

drop trigger if exists email_template_versions_immutable on public.email_template_versions;
create trigger email_template_versions_immutable before update or delete on public.email_template_versions for each row execute function private.reject_email_template_version_mutation();

alter table public.email_brand_kits enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_template_versions enable row level security;

revoke all on table public.email_brand_kits from anon,authenticated;
revoke all on table public.email_templates from anon,authenticated;
revoke all on table public.email_template_versions from anon,authenticated;
grant select on table public.email_brand_kits,public.email_templates,public.email_template_versions to authenticated;
grant all on table public.email_brand_kits,public.email_templates,public.email_template_versions to service_role;

drop policy if exists email_brand_kits_store_read on public.email_brand_kits;
create policy email_brand_kits_store_read on public.email_brand_kits for select to authenticated using (public.can_read_store(instance_id));
drop policy if exists email_templates_store_read on public.email_templates;
create policy email_templates_store_read on public.email_templates for select to authenticated using (public.can_read_store(instance_id));
drop policy if exists email_template_versions_store_read on public.email_template_versions;
create policy email_template_versions_store_read on public.email_template_versions for select to authenticated using (public.can_read_store(instance_id));

create or replace function public.save_default_email_brand_kit_v1(
  p_instance_id uuid,p_actor uuid,p_name text,p_logo_url text,p_tokens jsonb,p_company_details jsonb,p_social_links jsonb
) returns uuid language plpgsql security invoker set search_path=public,private as $$
declare v_id uuid;v_org uuid;v_before jsonb;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'EMAIL_BUILDER_FORBIDDEN'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select id,jsonb_build_object('name',name,'logo_url',logo_url,'tokens',tokens) into v_id,v_before from public.email_brand_kits where instance_id=p_instance_id and is_default for update;
  if v_id is null then
    insert into public.email_brand_kits(instance_id,name,is_default,logo_url,tokens,company_details,social_links,created_by,updated_by)
    values(p_instance_id,trim(p_name),true,nullif(trim(coalesce(p_logo_url,'')),''),coalesce(p_tokens,'{}'::jsonb),coalesce(p_company_details,'{}'::jsonb),coalesce(p_social_links,'{}'::jsonb),p_actor,p_actor)
    returning id into v_id;
  else
    update public.email_brand_kits set name=trim(p_name),logo_url=nullif(trim(coalesce(p_logo_url,'')),''),tokens=coalesce(p_tokens,'{}'::jsonb),company_details=coalesce(p_company_details,'{}'::jsonb),social_links=coalesce(p_social_links,'{}'::jsonb),updated_by=p_actor where id=v_id and instance_id=p_instance_id;
  end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  select p_actor,'email.brand_kit_saved','email_brand_kit',v_id::text,v_org,p_instance_id,'E-mail Brand Kit mentve.',v_before,jsonb_build_object('name',name,'logo_url',logo_url,'tokens',tokens),jsonb_build_object('audit_source','email_builder') from public.email_brand_kits where id=v_id and instance_id=p_instance_id;
  return v_id;
end $$;

create or replace function public.create_email_template_v1(
  p_instance_id uuid,p_actor uuid,p_template_key text,p_name text,p_family text,p_purpose text,p_document jsonb,p_brand_kit_id uuid default null
) returns uuid language plpgsql security invoker set search_path=public,private as $$
declare v_id uuid;v_org uuid;v_schema integer;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'EMAIL_BUILDER_FORBIDDEN'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  if jsonb_typeof(p_document) <> 'object' or jsonb_typeof(p_document->'schemaVersion') <> 'number' then raise exception 'EMAIL_DOCUMENT_INVALID'; end if;
  v_schema=(p_document->>'schemaVersion')::integer;
  if p_document->>'templateKey'<>p_template_key or p_document->>'family'<>p_family or p_document->>'purpose'<>p_purpose then raise exception 'EMAIL_DOCUMENT_IDENTITY_MISMATCH'; end if;
  if p_brand_kit_id is not null and not exists(select 1 from public.email_brand_kits where id=p_brand_kit_id and instance_id=p_instance_id) then raise exception 'EMAIL_BRAND_KIT_TENANT_MISMATCH'; end if;
  insert into public.email_templates(instance_id,template_key,name,family,purpose,status,brand_kit_id,draft_schema_version,draft_document,created_by,updated_by)
  values(p_instance_id,p_template_key,trim(p_name),p_family,p_purpose,'draft',p_brand_kit_id,v_schema,p_document,p_actor,p_actor)
  returning id into v_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'email.template_created','email_template',v_id::text,v_org,p_instance_id,'E-mail sablon létrehozva.',jsonb_build_object('template_key',p_template_key,'family',p_family,'purpose',p_purpose,'schema_version',v_schema),jsonb_build_object('audit_source','email_builder'));
  return v_id;
end $$;

create or replace function public.save_email_template_draft_v1(
  p_instance_id uuid,p_actor uuid,p_template_id uuid,p_document jsonb
) returns boolean language plpgsql security invoker set search_path=public,private as $$
declare v_template public.email_templates%rowtype;v_org uuid;v_schema integer;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'EMAIL_BUILDER_FORBIDDEN'; end if;
  select * into v_template from public.email_templates where id=p_template_id and instance_id=p_instance_id for update;
  if not found then raise exception 'EMAIL_TEMPLATE_NOT_FOUND'; end if;
  if v_template.status='archived' then raise exception 'EMAIL_TEMPLATE_ARCHIVED'; end if;
  if jsonb_typeof(p_document) <> 'object' or jsonb_typeof(p_document->'schemaVersion') <> 'number' then raise exception 'EMAIL_DOCUMENT_INVALID'; end if;
  v_schema=(p_document->>'schemaVersion')::integer;
  if p_document->>'templateKey'<>v_template.template_key or p_document->>'family'<>v_template.family or p_document->>'purpose'<>v_template.purpose then raise exception 'EMAIL_DOCUMENT_IDENTITY_MISMATCH'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  update public.email_templates set draft_document=p_document,draft_schema_version=v_schema,updated_by=p_actor where id=p_template_id and instance_id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(p_actor,'email.template_draft_saved','email_template',p_template_id::text,v_org,p_instance_id,'E-mail sablon piszkozat mentve.',jsonb_build_object('schema_version',v_template.draft_schema_version),jsonb_build_object('schema_version',v_schema),jsonb_build_object('audit_source','email_builder'));
  return true;
end $$;

create or replace function public.activate_email_template_v1(
  p_instance_id uuid,p_actor uuid,p_template_id uuid
) returns jsonb language plpgsql security invoker set search_path=public,private as $$
declare v_template public.email_templates%rowtype;v_org uuid;v_number integer;v_version uuid;
begin
  if p_actor is null or not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'EMAIL_BUILDER_FORBIDDEN'; end if;
  select * into v_template from public.email_templates where id=p_template_id and instance_id=p_instance_id for update;
  if not found then raise exception 'EMAIL_TEMPLATE_NOT_FOUND'; end if;
  if v_template.status='archived' then raise exception 'EMAIL_TEMPLATE_ARCHIVED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  select coalesce(max(version_number),0)+1 into v_number from public.email_template_versions where instance_id=p_instance_id and template_id=p_template_id;
  insert into public.email_template_versions(instance_id,template_id,version_number,schema_version,document,created_by,activated_at)
  values(p_instance_id,p_template_id,v_number,v_template.draft_schema_version,v_template.draft_document,p_actor,now()) returning id into v_version;
  update public.email_templates set active_version_id=v_version,status='active',updated_by=p_actor where id=p_template_id and instance_id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(p_actor,'email.template_activated','email_template',p_template_id::text,v_org,p_instance_id,'E-mail sablon új verziója aktiválva.',jsonb_build_object('active_version_id',v_template.active_version_id),jsonb_build_object('active_version_id',v_version,'version_number',v_number),jsonb_build_object('audit_source','email_builder'));
  return jsonb_build_object('versionId',v_version,'versionNumber',v_number);
end $$;

revoke all on function public.save_default_email_brand_kit_v1(uuid,uuid,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.create_email_template_v1(uuid,uuid,text,text,text,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.save_email_template_draft_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.activate_email_template_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_default_email_brand_kit_v1(uuid,uuid,text,text,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.create_email_template_v1(uuid,uuid,text,text,text,text,jsonb,uuid) to service_role;
grant execute on function public.save_email_template_draft_v1(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.activate_email_template_v1(uuid,uuid,uuid) to service_role;
