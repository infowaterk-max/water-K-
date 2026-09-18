-- Product Documents / Attachments authority.
-- Product documents are separate from paid digital assets and private order/customer documents.
-- The storage bucket remains private even for storefront-public documents; access is always server-authorized.

create table if not exists public.product_documents(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  kind text not null check(kind in('manual','datasheet','size_guide','warranty_info','compatibility','installation_guide','other')),
  title text not null check(char_length(trim(title)) between 1 and 200),
  description text check(description is null or char_length(description)<=2000),
  sort_order integer not null default 0 check(sort_order between 0 and 10000),
  visibility text not null default 'account' check(visibility in('public','account')),
  storage_bucket text not null default 'product-documents-private' check(storage_bucket='product-documents-private'),
  storage_path text not null check(char_length(storage_path) between 3 and 1000 and storage_path !~ '(^|/)\.\.(/|$)'),
  original_name text not null check(char_length(trim(original_name)) between 1 and 255),
  media_type text not null check(char_length(trim(media_type)) between 3 and 160),
  size_bytes bigint not null check(size_bytes between 1 and 26214400),
  checksum_sha256 text check(checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in('pending','active','revoked')),
  created_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,storage_path)
);
create index if not exists product_documents_product_idx on public.product_documents(instance_id,product_id,status,sort_order,created_at);
create index if not exists product_documents_variant_idx on public.product_documents(instance_id,variant_id,status,sort_order,created_at) where variant_id is not null;

create table if not exists public.product_document_download_audit(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  document_id uuid references public.product_documents(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  actor_type text not null check(actor_type in('public','account','system')),
  outcome text not null check(outcome in('allowed','denied')),
  reason text not null check(char_length(reason) between 1 and 160),
  request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists product_document_download_audit_document_idx on public.product_document_download_audit(document_id,created_at desc) where document_id is not null;
create index if not exists product_document_download_audit_fingerprint_idx on public.product_document_download_audit(instance_id,request_fingerprint,created_at desc);

alter table public.product_documents enable row level security;
alter table public.product_document_download_audit enable row level security;
revoke all on public.product_documents from public,anon,authenticated;
revoke all on public.product_document_download_audit from public,anon,authenticated;
revoke insert,update,delete on public.product_documents from service_role;
revoke insert,update,delete on public.product_document_download_audit from service_role;
grant select on public.product_documents to service_role;
grant select on public.product_document_download_audit to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'product-documents-private','product-documents-private',false,26214400,
  array[
    'application/pdf','image/jpeg','image/png','text/plain','text/csv',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.validate_product_document_scope_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_product_instance uuid;v_variant_instance uuid;v_variant_product uuid;
begin
  select instance_id into v_product_instance from public.products where id=new.product_id;
  if v_product_instance is null or v_product_instance<>new.instance_id then raise exception 'PRODUCT_DOCUMENT_PRODUCT_SCOPE_INVALID'; end if;
  if new.variant_id is not null then
    select instance_id,product_id into v_variant_instance,v_variant_product from public.product_variants where id=new.variant_id;
    if v_variant_instance is null or v_variant_instance<>new.instance_id or v_variant_product<>new.product_id then raise exception 'PRODUCT_DOCUMENT_VARIANT_SCOPE_INVALID'; end if;
  end if;
  if new.storage_path is null or new.storage_path not like new.instance_id::text||'/'||new.product_id::text||'/%' or new.storage_path ~ '(^|/)\.\.(/|$)' then raise exception 'PRODUCT_DOCUMENT_PATH_INVALID'; end if;
  new.updated_at:=now();
  return new;
end;
$$;
drop trigger if exists product_documents_validate_scope on public.product_documents;
create trigger product_documents_validate_scope
before insert or update of instance_id,product_id,variant_id,storage_path on public.product_documents
for each row execute function private.validate_product_document_scope_v1();

create or replace function public.admin_prepare_product_document_v1(
  p_instance_id uuid,p_actor uuid,p_document_id uuid,p_product_id uuid,p_variant_id uuid,
  p_kind text,p_title text,p_description text,p_sort_order integer,p_visibility text,
  p_storage_path text,p_original_name text,p_media_type text,p_size_bytes bigint,p_checksum_sha256 text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'PRODUCT_DOCUMENT_FORBIDDEN'; end if;
  if p_kind not in('manual','datasheet','size_guide','warranty_info','compatibility','installation_guide','other') then raise exception 'PRODUCT_DOCUMENT_KIND_INVALID'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 1 and 200 then raise exception 'PRODUCT_DOCUMENT_TITLE_INVALID'; end if;
  if char_length(coalesce(p_description,''))>2000 then raise exception 'PRODUCT_DOCUMENT_DESCRIPTION_INVALID'; end if;
  if p_sort_order<0 or p_sort_order>10000 then raise exception 'PRODUCT_DOCUMENT_SORT_INVALID'; end if;
  if p_visibility not in('public','account') then raise exception 'PRODUCT_DOCUMENT_VISIBILITY_INVALID'; end if;
  if char_length(trim(coalesce(p_original_name,''))) not between 1 and 255 then raise exception 'PRODUCT_DOCUMENT_NAME_INVALID'; end if;
  if p_media_type not in('application/pdf','image/jpeg','image/png','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'PRODUCT_DOCUMENT_MEDIA_TYPE_INVALID'; end if;
  if p_size_bytes<1 or p_size_bytes>26214400 then raise exception 'PRODUCT_DOCUMENT_SIZE_INVALID'; end if;
  if p_checksum_sha256 is not null and p_checksum_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'PRODUCT_DOCUMENT_CHECKSUM_INVALID'; end if;

  insert into public.product_documents(
    id,instance_id,product_id,variant_id,kind,title,description,sort_order,visibility,storage_path,original_name,media_type,size_bytes,checksum_sha256,status,created_by
  ) values(
    p_document_id,p_instance_id,p_product_id,p_variant_id,p_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_sort_order,p_visibility,p_storage_path,trim(p_original_name),p_media_type,p_size_bytes,p_checksum_sha256,'pending',p_actor
  );
  return pg_catalog.jsonb_build_object('documentId',p_document_id,'bucket','product-documents-private','path',p_storage_path,'status','pending');
end;
$$;

create or replace function public.admin_activate_product_document_v1(
  p_instance_id uuid,p_actor uuid,p_document_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.product_documents%rowtype;v_storage_count integer;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'PRODUCT_DOCUMENT_FORBIDDEN'; end if;
  select * into v_doc from public.product_documents where id=p_document_id and instance_id=p_instance_id for update;
  if not found then raise exception 'PRODUCT_DOCUMENT_NOT_FOUND'; end if;
  if v_doc.status='revoked' then raise exception 'PRODUCT_DOCUMENT_REVOKED'; end if;
  select count(*)::integer into v_storage_count from storage.objects where bucket_id=v_doc.storage_bucket and name=v_doc.storage_path;
  if v_storage_count<>1 then raise exception 'PRODUCT_DOCUMENT_STORAGE_OBJECT_MISSING'; end if;
  update public.product_documents set status='active',activated_at=coalesce(activated_at,now()),revoked_at=null,updated_at=now() where id=v_doc.id and instance_id=p_instance_id;
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'status','active','path',v_doc.storage_path,'bucket',v_doc.storage_bucket);
end;
$$;

create or replace function public.admin_revoke_product_document_v1(
  p_instance_id uuid,p_actor uuid,p_document_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.product_documents%rowtype;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'PRODUCT_DOCUMENT_FORBIDDEN'; end if;
  select * into v_doc from public.product_documents where id=p_document_id and instance_id=p_instance_id for update;
  if not found then raise exception 'PRODUCT_DOCUMENT_NOT_FOUND'; end if;
  update public.product_documents set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now() where id=v_doc.id and instance_id=p_instance_id;
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'status','revoked','path',v_doc.storage_path,'bucket',v_doc.storage_bucket);
end;
$$;

create or replace function public.list_storefront_product_documents_v1(
  p_instance_id uuid,p_variant_id uuid,p_customer_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_product_id uuid;v_variant_instance uuid;v_result jsonb;
begin
  select product_id,instance_id into v_product_id,v_variant_instance from public.product_variants where id=p_variant_id;
  if v_product_id is null or v_variant_instance<>p_instance_id then return '[]'::jsonb; end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentId',d.id,'kind',d.kind,'title',d.title,'description',d.description,'sortOrder',d.sort_order,
    'visibility',d.visibility,'fileName',d.original_name,'mediaType',d.media_type,'sizeBytes',d.size_bytes,
    'variantSpecific',d.variant_id is not null
  ) order by d.sort_order,d.created_at,d.id),'[]'::jsonb)
  into v_result
  from public.product_documents d
  where d.instance_id=p_instance_id and d.product_id=v_product_id and(d.variant_id is null or d.variant_id=p_variant_id)
    and d.status='active' and(d.visibility='public' or(d.visibility='account' and p_customer_id is not null));
  return coalesce(v_result,'[]'::jsonb);
end;
$$;

create or replace function public.authorize_product_document_download_v1(
  p_instance_id uuid,p_document_id uuid,p_variant_id uuid,p_customer_id uuid default null,p_request_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.product_documents%rowtype;v_product_id uuid;v_variant_instance uuid;v_recent integer;v_actor text;
begin
  if p_request_fingerprint is null or p_request_fingerprint !~ '^[a-f0-9]{64}$' then return null; end if;
  select product_id,instance_id into v_product_id,v_variant_instance from public.product_variants where id=p_variant_id;
  if v_product_id is null or v_variant_instance<>p_instance_id then return null; end if;
  select * into v_doc from public.product_documents
  where id=p_document_id and instance_id=p_instance_id and product_id=v_product_id and(variant_id is null or variant_id=p_variant_id) and status='active';
  if not found then return null; end if;
  if v_doc.visibility='account' and p_customer_id is null then return null; end if;
  v_actor:=case when p_customer_id is null then 'public' else 'account' end;
  select count(*)::integer into v_recent from public.product_document_download_audit
  where instance_id=p_instance_id and document_id=p_document_id and request_fingerprint=p_request_fingerprint and outcome='allowed' and created_at>now()-interval '1 hour';
  if v_recent>=60 then
    insert into public.product_document_download_audit(instance_id,document_id,product_id,variant_id,customer_id,actor_type,outcome,reason,request_fingerprint)
    values(p_instance_id,p_document_id,v_product_id,p_variant_id,p_customer_id,v_actor,'denied','RATE_LIMIT',p_request_fingerprint);
    return null;
  end if;
  insert into public.product_document_download_audit(instance_id,document_id,product_id,variant_id,customer_id,actor_type,outcome,reason,request_fingerprint)
  values(p_instance_id,p_document_id,v_product_id,p_variant_id,p_customer_id,v_actor,'allowed','AUTHORIZED',p_request_fingerprint);
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'bucket',v_doc.storage_bucket,'path',v_doc.storage_path,'fileName',v_doc.original_name,'mediaType',v_doc.media_type,'sizeBytes',v_doc.size_bytes,'visibility',v_doc.visibility,'actorType',v_actor);
end;
$$;

revoke all on function public.admin_prepare_product_document_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.admin_activate_product_document_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_revoke_product_document_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_storefront_product_documents_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_prepare_product_document_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text,bigint,text) to service_role;
grant execute on function public.admin_activate_product_document_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.admin_revoke_product_document_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.list_storefront_product_documents_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text) to service_role;
