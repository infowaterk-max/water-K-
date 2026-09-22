-- Storefront Runtime Wave 0B: tenant-scoped page persistence, immutable revisions,
-- preview sessions, publish/rollback transactions and append-only audit evidence.
--
-- This migration intentionally does not switch any live storefront route to the runtime.
-- Browser roles receive no direct access to the new persistence tables. All mutations
-- are service-role RPCs that also verify the acting user still has owner/admin authority.

create table if not exists public.storefront_pages (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  page_key text not null check (page_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  page_type text not null check (page_type in (
    'home','catalog','product','cart','checkout','account','search','content',
    'blog-index','blog-article','faq','contact','legal','not-found'
  )),
  draft_revision_id uuid,
  published_revision_id uuid,
  next_revision integer not null default 1 check (next_revision >= 1),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,page_key),
  unique(instance_id,id)
);

create table if not exists public.storefront_page_revisions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  page_id uuid not null,
  revision_number integer not null check (revision_number >= 1),
  kind text not null check (kind in ('draft','published')),
  schema_version integer not null check (schema_version >= 1),
  page_key text not null check (page_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  page_type text not null check (page_type in (
    'home','catalog','product','cart','checkout','account','search','content',
    'blog-index','blog-article','faq','contact','legal','not-found'
  )),
  template_key text not null check (template_key ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  template_version integer not null check (template_version >= 1),
  document jsonb not null check (jsonb_typeof(document)='object'),
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  source_revision_id uuid,
  operation_key text not null check (operation_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(instance_id,id),
  unique(instance_id,page_id,id),
  unique(instance_id,page_id,revision_number),
  unique(instance_id,operation_key),
  foreign key(instance_id,page_id) references public.storefront_pages(instance_id,id) on delete cascade,
  foreign key(instance_id,page_id,source_revision_id)
    references public.storefront_page_revisions(instance_id,page_id,id)
);

alter table public.storefront_pages
  drop constraint if exists storefront_pages_draft_revision_fk;
alter table public.storefront_pages
  add constraint storefront_pages_draft_revision_fk
  foreign key(instance_id,id,draft_revision_id)
  references public.storefront_page_revisions(instance_id,page_id,id);

alter table public.storefront_pages
  drop constraint if exists storefront_pages_published_revision_fk;
alter table public.storefront_pages
  add constraint storefront_pages_published_revision_fk
  foreign key(instance_id,id,published_revision_id)
  references public.storefront_page_revisions(instance_id,page_id,id);

create table if not exists public.storefront_preview_sessions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  page_id uuid not null,
  revision_id uuid not null,
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  operation_key text not null check (operation_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(token_hash),
  unique(instance_id,operation_key),
  unique(instance_id,id),
  foreign key(instance_id,page_id,revision_id)
    references public.storefront_page_revisions(instance_id,page_id,id) on delete cascade
);

create table if not exists public.storefront_page_events (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  page_id uuid not null,
  event_type text not null check (event_type in (
    'draft_saved','preview_created','preview_revoked','published','rollback_published'
  )),
  revision_id uuid,
  source_revision_id uuid,
  preview_session_id uuid,
  operation_key text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  foreign key(instance_id,page_id) references public.storefront_pages(instance_id,id) on delete cascade,
  foreign key(instance_id,page_id,revision_id)
    references public.storefront_page_revisions(instance_id,page_id,id),
  foreign key(instance_id,page_id,source_revision_id)
    references public.storefront_page_revisions(instance_id,page_id,id),
  foreign key(instance_id,preview_session_id)
    references public.storefront_preview_sessions(instance_id,id),
  unique(instance_id,operation_key,event_type)
);

create index if not exists storefront_pages_instance_type_idx
  on public.storefront_pages(instance_id,page_type,page_key);
create index if not exists storefront_page_revisions_page_history_idx
  on public.storefront_page_revisions(instance_id,page_id,revision_number desc);
create index if not exists storefront_page_revisions_kind_idx
  on public.storefront_page_revisions(instance_id,page_id,kind,revision_number desc);
create index if not exists storefront_preview_sessions_expiry_idx
  on public.storefront_preview_sessions(instance_id,expires_at)
  where revoked_at is null;
create index if not exists storefront_page_events_history_idx
  on public.storefront_page_events(instance_id,page_id,created_at desc);

alter table public.storefront_pages enable row level security;
alter table public.storefront_page_revisions enable row level security;
alter table public.storefront_preview_sessions enable row level security;
alter table public.storefront_page_events enable row level security;

-- Server-only persistence boundary. Storefront rendering and Builder server actions use
-- the service client after application-level tenant/RBAC checks. Mutation RPCs below
-- add a second owner/admin authority check inside the database transaction.
revoke all on public.storefront_pages from public,anon,authenticated;
revoke all on public.storefront_page_revisions from public,anon,authenticated;
revoke all on public.storefront_preview_sessions from public,anon,authenticated;
revoke all on public.storefront_page_events from public,anon,authenticated;
revoke insert,update,delete on public.storefront_pages from service_role;
revoke insert,update,delete on public.storefront_page_revisions from service_role;
revoke insert,update,delete on public.storefront_preview_sessions from service_role;
revoke insert,update,delete on public.storefront_page_events from service_role;
grant select on public.storefront_pages to service_role;
grant select on public.storefront_page_revisions to service_role;
grant select on public.storefront_preview_sessions to service_role;
grant select on public.storefront_page_events to service_role;

create or replace function public.can_manage_storefront(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql stable security invoker set search_path=''
as $$
  select public.is_platform_operator(p_user_id)
    or public.has_store_role(p_instance_id,array['owner','admin'],p_user_id);
$$;

revoke all on function public.can_manage_storefront(uuid,uuid) from public,anon;
grant execute on function public.can_manage_storefront(uuid,uuid) to authenticated,service_role;

create or replace function public.storefront_assert_page_document_identity(
  p_document jsonb,
  p_page_key text,
  p_page_type text,
  p_schema_version integer,
  p_template_key text,
  p_template_version integer
) returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  if p_document is null or jsonb_typeof(p_document)<>'object' then
    raise exception 'STOREFRONT_DOCUMENT_INVALID';
  end if;
  if pg_catalog.octet_length(p_document::text)>2097152 then
    raise exception 'STOREFRONT_DOCUMENT_TOO_LARGE';
  end if;
  if coalesce(p_document->>'pageKey','')<>p_page_key
     or coalesce(p_document->>'pageType','')<>p_page_type
     or coalesce(p_document->>'templateKey','')<>p_template_key then
    raise exception 'STOREFRONT_DOCUMENT_IDENTITY_MISMATCH';
  end if;
  if coalesce(p_document->>'schemaVersion','') !~ '^[0-9]+$'
     or (p_document->>'schemaVersion')::integer<>p_schema_version then
    raise exception 'STOREFRONT_DOCUMENT_SCHEMA_MISMATCH';
  end if;
  if coalesce(p_document->>'templateVersion','') !~ '^[0-9]+$'
     or (p_document->>'templateVersion')::integer<>p_template_version then
    raise exception 'STOREFRONT_DOCUMENT_TEMPLATE_VERSION_MISMATCH';
  end if;
end;
$$;

revoke all on function public.storefront_assert_page_document_identity(jsonb,text,text,integer,text,integer)
from public,anon,authenticated,service_role;

create or replace function public.storefront_revisions_immutable()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'STOREFRONT_REVISION_IMMUTABLE';
end;
$$;

create or replace function public.storefront_events_immutable()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'STOREFRONT_EVENT_IMMUTABLE';
end;
$$;

create or replace function public.storefront_preview_session_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    raise exception 'STOREFRONT_PREVIEW_DELETE_FORBIDDEN';
  end if;
  if new.instance_id is distinct from old.instance_id
     or new.page_id is distinct from old.page_id
     or new.revision_id is distinct from old.revision_id
     or new.token_hash is distinct from old.token_hash
     or new.expires_at is distinct from old.expires_at
     or new.operation_key is distinct from old.operation_key
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'STOREFRONT_PREVIEW_IDENTITY_IMMUTABLE';
  end if;
  if old.revoked_at is not null or new.revoked_at is null then
    raise exception 'STOREFRONT_PREVIEW_REVOCATION_INVALID';
  end if;
  return new;
end;
$$;

drop trigger if exists storefront_page_revisions_immutable_trg on public.storefront_page_revisions;
create trigger storefront_page_revisions_immutable_trg
before update or delete on public.storefront_page_revisions
for each row execute function public.storefront_revisions_immutable();

drop trigger if exists storefront_page_events_immutable_trg on public.storefront_page_events;
create trigger storefront_page_events_immutable_trg
before update or delete on public.storefront_page_events
for each row execute function public.storefront_events_immutable();

drop trigger if exists storefront_preview_sessions_guard_trg on public.storefront_preview_sessions;
create trigger storefront_preview_sessions_guard_trg
before update or delete on public.storefront_preview_sessions
for each row execute function public.storefront_preview_session_guard();

create or replace function public.save_storefront_page_draft_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_page_key text,
  p_page_type text,
  p_schema_version integer,
  p_template_key text,
  p_template_version integer,
  p_document jsonb,
  p_document_sha256 text,
  p_expected_draft_revision integer,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_page public.storefront_pages%rowtype;
  v_current public.storefront_page_revisions%rowtype;
  v_existing public.storefront_page_revisions%rowtype;
  v_revision public.storefront_page_revisions%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_document_sha256 is null or p_document_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'STOREFRONT_DOCUMENT_HASH_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  perform public.storefront_assert_page_document_identity(p_document,p_page_key,p_page_type,p_schema_version,p_template_key,p_template_version);

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_existing from public.storefront_page_revisions
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_existing.kind<>'draft' or v_existing.page_key<>p_page_key
       or v_existing.document_sha256<>p_document_sha256 then
      raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT';
    end if;
    return jsonb_build_object(
      'pageId',v_existing.page_id,'revisionId',v_existing.id,
      'revisionNumber',v_existing.revision_number,'kind',v_existing.kind,
      'documentSha256',v_existing.document_sha256,'replayed',true
    );
  end if;

  select * into v_page from public.storefront_pages
  where instance_id=p_instance_id and page_key=p_page_key for update;

  if not found then
    if p_expected_draft_revision is not null then raise exception 'STOREFRONT_DRAFT_STALE'; end if;
    insert into public.storefront_pages(instance_id,page_key,page_type,created_by,updated_by)
    values(p_instance_id,p_page_key,p_page_type,p_actor_user_id,p_actor_user_id)
    returning * into v_page;
  elsif v_page.page_type<>p_page_type then
    raise exception 'STOREFRONT_PAGE_TYPE_IMMUTABLE';
  end if;

  if v_page.draft_revision_id is not null then
    select * into v_current from public.storefront_page_revisions
    where instance_id=p_instance_id and page_id=v_page.id and id=v_page.draft_revision_id;
  end if;

  if p_expected_draft_revision is distinct from v_current.revision_number then
    raise exception 'STOREFRONT_DRAFT_STALE';
  end if;

  insert into public.storefront_page_revisions(
    instance_id,page_id,revision_number,kind,schema_version,page_key,page_type,
    template_key,template_version,document,document_sha256,source_revision_id,
    operation_key,created_by
  ) values(
    p_instance_id,v_page.id,v_page.next_revision,'draft',p_schema_version,p_page_key,p_page_type,
    p_template_key,p_template_version,p_document,p_document_sha256,v_page.draft_revision_id,
    p_operation_key,p_actor_user_id
  ) returning * into v_revision;

  update public.storefront_pages
  set draft_revision_id=v_revision.id,next_revision=v_page.next_revision+1,
      updated_by=p_actor_user_id,updated_at=now()
  where id=v_page.id and instance_id=p_instance_id;

  insert into public.storefront_page_events(
    instance_id,page_id,event_type,revision_id,source_revision_id,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,v_page.id,'draft_saved',v_revision.id,v_page.draft_revision_id,
    p_operation_key,p_actor_user_id,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'documentSha256',p_document_sha256)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.page_draft_saved','storefront_page',v_page.id::text,v_org,p_instance_id,
    'Storefront oldal vázlat mentve',
    jsonb_build_object('pageKey',p_page_key,'pageType',p_page_type,'revisionNumber',v_revision.revision_number,'templateKey',p_template_key,'templateVersion',p_template_version),
    jsonb_build_object('audit_source','database_rpc','rpc','save_storefront_page_draft_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object(
    'pageId',v_page.id,'revisionId',v_revision.id,'revisionNumber',v_revision.revision_number,
    'kind','draft','documentSha256',v_revision.document_sha256,'replayed',false
  );
end;
$$;

create or replace function public.publish_storefront_page_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_page_id uuid,
  p_expected_draft_revision integer,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_page public.storefront_pages%rowtype;
  v_draft public.storefront_page_revisions%rowtype;
  v_previous public.storefront_page_revisions%rowtype;
  v_existing public.storefront_page_revisions%rowtype;
  v_revision public.storefront_page_revisions%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_page_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_existing from public.storefront_page_revisions
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_existing.kind<>'published' or v_existing.page_id<>p_page_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object('pageId',p_page_id,'revisionId',v_existing.id,'revisionNumber',v_existing.revision_number,'kind','published','replayed',true);
  end if;

  select * into v_page from public.storefront_pages
  where id=p_page_id and instance_id=p_instance_id for update;
  if not found then raise exception 'STOREFRONT_PAGE_NOT_FOUND'; end if;
  if v_page.draft_revision_id is null then raise exception 'STOREFRONT_DRAFT_REQUIRED'; end if;

  select * into v_draft from public.storefront_page_revisions
  where id=v_page.draft_revision_id and page_id=p_page_id and instance_id=p_instance_id;
  if not found or v_draft.kind<>'draft' then raise exception 'STOREFRONT_DRAFT_INVALID'; end if;
  if p_expected_draft_revision is distinct from v_draft.revision_number then raise exception 'STOREFRONT_DRAFT_STALE'; end if;

  if v_page.published_revision_id is not null then
    select * into v_previous from public.storefront_page_revisions
    where id=v_page.published_revision_id and page_id=p_page_id and instance_id=p_instance_id;
  end if;

  insert into public.storefront_page_revisions(
    instance_id,page_id,revision_number,kind,schema_version,page_key,page_type,
    template_key,template_version,document,document_sha256,source_revision_id,
    operation_key,created_by
  ) values(
    p_instance_id,p_page_id,v_page.next_revision,'published',v_draft.schema_version,v_draft.page_key,v_draft.page_type,
    v_draft.template_key,v_draft.template_version,v_draft.document,v_draft.document_sha256,v_draft.id,
    p_operation_key,p_actor_user_id
  ) returning * into v_revision;

  update public.storefront_pages
  set published_revision_id=v_revision.id,next_revision=v_page.next_revision+1,
      updated_by=p_actor_user_id,updated_at=now()
  where id=p_page_id and instance_id=p_instance_id;

  insert into public.storefront_page_events(
    instance_id,page_id,event_type,revision_id,source_revision_id,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,p_page_id,'published',v_revision.id,v_draft.id,p_operation_key,p_actor_user_id,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'draftRevisionNumber',v_draft.revision_number,'previousPublishedRevision',v_previous.revision_number)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.page_published','storefront_page',p_page_id::text,v_org,p_instance_id,
    'Storefront oldal publikálva',
    case when v_previous.id is null then null else jsonb_build_object('revisionNumber',v_previous.revision_number,'documentSha256',v_previous.document_sha256) end,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'documentSha256',v_revision.document_sha256,'sourceDraftRevision',v_draft.revision_number),
    jsonb_build_object('audit_source','database_rpc','rpc','publish_storefront_page_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object('pageId',p_page_id,'revisionId',v_revision.id,'revisionNumber',v_revision.revision_number,'kind','published','replayed',false);
end;
$$;

create or replace function public.rollback_storefront_page_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_page_id uuid,
  p_target_published_revision integer,
  p_expected_current_published_revision integer,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_page public.storefront_pages%rowtype;
  v_current public.storefront_page_revisions%rowtype;
  v_target public.storefront_page_revisions%rowtype;
  v_existing public.storefront_page_revisions%rowtype;
  v_revision public.storefront_page_revisions%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_page_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_target_published_revision is null or p_target_published_revision<1 then raise exception 'STOREFRONT_ROLLBACK_TARGET_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_existing from public.storefront_page_revisions
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_existing.kind<>'published' or v_existing.page_id<>p_page_id then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object('pageId',p_page_id,'revisionId',v_existing.id,'revisionNumber',v_existing.revision_number,'kind','published','replayed',true);
  end if;

  select * into v_page from public.storefront_pages
  where id=p_page_id and instance_id=p_instance_id for update;
  if not found then raise exception 'STOREFRONT_PAGE_NOT_FOUND'; end if;
  if v_page.published_revision_id is null then raise exception 'STOREFRONT_PUBLISHED_REVISION_REQUIRED'; end if;

  select * into v_current from public.storefront_page_revisions
  where id=v_page.published_revision_id and page_id=p_page_id and instance_id=p_instance_id;
  if not found or v_current.kind<>'published' then raise exception 'STOREFRONT_PUBLISHED_REVISION_INVALID'; end if;
  if p_expected_current_published_revision is distinct from v_current.revision_number then raise exception 'STOREFRONT_PUBLISHED_STALE'; end if;

  select * into v_target from public.storefront_page_revisions
  where instance_id=p_instance_id and page_id=p_page_id
    and revision_number=p_target_published_revision and kind='published';
  if not found then raise exception 'STOREFRONT_ROLLBACK_TARGET_NOT_FOUND'; end if;

  insert into public.storefront_page_revisions(
    instance_id,page_id,revision_number,kind,schema_version,page_key,page_type,
    template_key,template_version,document,document_sha256,source_revision_id,
    operation_key,created_by
  ) values(
    p_instance_id,p_page_id,v_page.next_revision,'published',v_target.schema_version,v_target.page_key,v_target.page_type,
    v_target.template_key,v_target.template_version,v_target.document,v_target.document_sha256,v_target.id,
    p_operation_key,p_actor_user_id
  ) returning * into v_revision;

  update public.storefront_pages
  set published_revision_id=v_revision.id,next_revision=v_page.next_revision+1,
      updated_by=p_actor_user_id,updated_at=now()
  where id=p_page_id and instance_id=p_instance_id;

  insert into public.storefront_page_events(
    instance_id,page_id,event_type,revision_id,source_revision_id,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,p_page_id,'rollback_published',v_revision.id,v_target.id,p_operation_key,p_actor_user_id,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'rolledBackFrom',v_current.revision_number,'targetHistoricalRevision',v_target.revision_number)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.page_rollback_published','storefront_page',p_page_id::text,v_org,p_instance_id,
    'Storefront oldal korábbi publikált állapotra visszaállítva',
    jsonb_build_object('revisionNumber',v_current.revision_number,'documentSha256',v_current.document_sha256),
    jsonb_build_object('revisionNumber',v_revision.revision_number,'documentSha256',v_revision.document_sha256,'targetHistoricalRevision',v_target.revision_number),
    jsonb_build_object('audit_source','database_rpc','rpc','rollback_storefront_page_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object('pageId',p_page_id,'revisionId',v_revision.id,'revisionNumber',v_revision.revision_number,'kind','published','replayed',false,'rolledBackFrom',v_current.revision_number,'targetHistoricalRevision',v_target.revision_number);
end;
$$;

create or replace function public.create_storefront_preview_session_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_page_id uuid,
  p_revision_number integer,
  p_token_hash text,
  p_expires_at timestamptz,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_page public.storefront_pages%rowtype;
  v_revision public.storefront_page_revisions%rowtype;
  v_existing public.storefront_preview_sessions%rowtype;
  v_session public.storefront_preview_sessions%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_page_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'STOREFRONT_PREVIEW_TOKEN_HASH_INVALID'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '24 hours' then raise exception 'STOREFRONT_PREVIEW_EXPIRY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_existing from public.storefront_preview_sessions
  where instance_id=p_instance_id and operation_key=p_operation_key;
  if found then
    if v_existing.page_id<>p_page_id or v_existing.token_hash<>p_token_hash then raise exception 'STOREFRONT_OPERATION_KEY_CONFLICT'; end if;
    return jsonb_build_object('sessionId',v_existing.id,'pageId',v_existing.page_id,'revisionId',v_existing.revision_id,'expiresAt',v_existing.expires_at,'replayed',true);
  end if;

  select * into v_page from public.storefront_pages where id=p_page_id and instance_id=p_instance_id;
  if not found then raise exception 'STOREFRONT_PAGE_NOT_FOUND'; end if;
  select * into v_revision from public.storefront_page_revisions
  where instance_id=p_instance_id and page_id=p_page_id and revision_number=p_revision_number and kind='draft';
  if not found then raise exception 'STOREFRONT_PREVIEW_DRAFT_NOT_FOUND'; end if;

  insert into public.storefront_preview_sessions(
    instance_id,page_id,revision_id,token_hash,expires_at,operation_key,created_by
  ) values(
    p_instance_id,p_page_id,v_revision.id,p_token_hash,p_expires_at,p_operation_key,p_actor_user_id
  ) returning * into v_session;

  insert into public.storefront_page_events(
    instance_id,page_id,event_type,revision_id,preview_session_id,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,p_page_id,'preview_created',v_revision.id,v_session.id,p_operation_key,p_actor_user_id,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'expiresAt',v_session.expires_at)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.preview_created','storefront_preview',v_session.id::text,v_org,p_instance_id,
    'Storefront előnézeti munkamenet létrehozva',
    jsonb_build_object('pageId',p_page_id,'revisionNumber',v_revision.revision_number,'expiresAt',v_session.expires_at),
    jsonb_build_object('audit_source','database_rpc','rpc','create_storefront_preview_session_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object('sessionId',v_session.id,'pageId',p_page_id,'revisionId',v_revision.id,'revisionNumber',v_revision.revision_number,'expiresAt',v_session.expires_at,'replayed',false);
end;
$$;

create or replace function public.revoke_storefront_preview_session_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_session_id uuid,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_session public.storefront_preview_sessions%rowtype;
  v_revision public.storefront_page_revisions%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null or p_session_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then raise exception 'STOREFRONT_OPERATION_KEY_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if exists(select 1 from public.storefront_page_events where instance_id=p_instance_id and operation_key=p_operation_key and event_type='preview_revoked') then
    select * into v_session from public.storefront_preview_sessions where id=p_session_id and instance_id=p_instance_id;
    if not found then raise exception 'STOREFRONT_PREVIEW_NOT_FOUND'; end if;
    return jsonb_build_object('sessionId',p_session_id,'revokedAt',v_session.revoked_at,'replayed',true);
  end if;

  select * into v_session from public.storefront_preview_sessions
  where id=p_session_id and instance_id=p_instance_id for update;
  if not found then raise exception 'STOREFRONT_PREVIEW_NOT_FOUND'; end if;
  select * into v_revision from public.storefront_page_revisions
  where id=v_session.revision_id and page_id=v_session.page_id and instance_id=p_instance_id;

  if v_session.revoked_at is null then
    update public.storefront_preview_sessions set revoked_at=now()
    where id=p_session_id and instance_id=p_instance_id
    returning * into v_session;
  end if;

  insert into public.storefront_page_events(
    instance_id,page_id,event_type,revision_id,preview_session_id,operation_key,actor_user_id,metadata
  ) values(
    p_instance_id,v_session.page_id,'preview_revoked',v_session.revision_id,v_session.id,p_operation_key,p_actor_user_id,
    jsonb_build_object('revisionNumber',v_revision.revision_number,'revokedAt',v_session.revoked_at)
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.preview_revoked','storefront_preview',p_session_id::text,v_org,p_instance_id,
    'Storefront előnézeti munkamenet visszavonva',
    jsonb_build_object('pageId',v_session.page_id,'revisionNumber',v_revision.revision_number,'revokedAt',v_session.revoked_at),
    jsonb_build_object('audit_source','database_rpc','rpc','revoke_storefront_preview_session_v1','operationKey',p_operation_key)
  );

  return jsonb_build_object('sessionId',p_session_id,'revokedAt',v_session.revoked_at,'replayed',false);
end;
$$;

revoke all on function public.save_storefront_page_draft_v1(uuid,uuid,text,text,integer,text,integer,jsonb,text,integer,text)
from public,anon,authenticated;
revoke all on function public.publish_storefront_page_v1(uuid,uuid,uuid,integer,text)
from public,anon,authenticated;
revoke all on function public.rollback_storefront_page_v1(uuid,uuid,uuid,integer,integer,text)
from public,anon,authenticated;
revoke all on function public.create_storefront_preview_session_v1(uuid,uuid,uuid,integer,text,timestamptz,text)
from public,anon,authenticated;
revoke all on function public.revoke_storefront_preview_session_v1(uuid,uuid,uuid,text)
from public,anon,authenticated;

grant execute on function public.save_storefront_page_draft_v1(uuid,uuid,text,text,integer,text,integer,jsonb,text,integer,text)
to service_role;
grant execute on function public.publish_storefront_page_v1(uuid,uuid,uuid,integer,text)
to service_role;
grant execute on function public.rollback_storefront_page_v1(uuid,uuid,uuid,integer,integer,text)
to service_role;
grant execute on function public.create_storefront_preview_session_v1(uuid,uuid,uuid,integer,text,timestamptz,text)
to service_role;
grant execute on function public.revoke_storefront_preview_session_v1(uuid,uuid,uuid,text)
to service_role;

comment on table public.storefront_pages is 'Tenant-scoped mutable storefront page head pointers. Draft and published documents live only in immutable revision rows.';
comment on table public.storefront_page_revisions is 'Immutable versioned storefront Page Schema snapshots for drafts and published states.';
comment on table public.storefront_preview_sessions is 'Hashed, expiring, revocable preview capability tokens bound to one immutable draft revision.';
comment on table public.storefront_page_events is 'Append-only storefront page lifecycle evidence.';
comment on function public.save_storefront_page_draft_v1(uuid,uuid,text,text,integer,text,integer,jsonb,text,integer,text) is 'Optimistic-concurrency draft save creating a new immutable Page Schema revision and audit evidence.';
comment on function public.publish_storefront_page_v1(uuid,uuid,uuid,integer,text) is 'Atomic publish: copies the expected immutable draft into a new published revision, advances the page pointer and records audit evidence.';
comment on function public.rollback_storefront_page_v1(uuid,uuid,uuid,integer,integer,text) is 'Atomic rollback: republishes a historical published revision as a new monotonic published revision without mutating history.';
comment on function public.create_storefront_preview_session_v1(uuid,uuid,uuid,integer,text,timestamptz,text) is 'Creates a max-24h hashed preview capability bound to one immutable draft revision.';
comment on function public.revoke_storefront_preview_session_v1(uuid,uuid,uuid,text) is 'Revokes a preview session without deleting immutable preview history.';
