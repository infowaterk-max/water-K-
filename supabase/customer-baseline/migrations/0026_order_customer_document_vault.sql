-- Order customer document vault.
-- Keeps post-purchase documents (invoice copy, warranty, certificate, merchant attachment, other)
-- separate from paid digital product entitlements and from public/product documents.

create table if not exists public.order_customer_documents(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  order_id uuid not null,
  kind text not null check(kind in('invoice','warranty','certificate','service_record','merchant_attachment','other')),
  title text not null check(char_length(trim(title)) between 1 and 200),
  description text check(description is null or char_length(description)<=2000),
  storage_bucket text not null default 'order-documents-private' check(storage_bucket='order-documents-private'),
  storage_path text not null check(char_length(storage_path) between 3 and 1000 and storage_path !~ '(^|/)\.\.(/|$)'),
  original_name text not null check(char_length(trim(original_name)) between 1 and 255),
  media_type text not null check(char_length(trim(media_type)) between 3 and 160),
  size_bytes bigint not null check(size_bytes between 1 and 26214400),
  checksum_sha256 text check(checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in('pending','active','revoked')),
  customer_visible boolean not null default true,
  download_count bigint not null default 0 check(download_count>=0),
  last_download_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(order_id,instance_id) references public.orders(id,instance_id) on delete cascade,
  unique(instance_id,storage_path)
);
create index if not exists order_customer_documents_order_idx on public.order_customer_documents(instance_id,order_id,status,created_at desc);
create index if not exists order_customer_documents_customer_visible_idx on public.order_customer_documents(instance_id,status,customer_visible,created_at desc) where customer_visible=true;

create table if not exists public.order_document_download_audit(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  order_id uuid not null,
  document_id uuid references public.order_customer_documents(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  outcome text not null check(outcome in('allowed','denied')),
  reason text not null check(char_length(reason) between 1 and 160),
  request_fingerprint text check(request_fingerprint is null or request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key(order_id,instance_id) references public.orders(id,instance_id) on delete cascade
);
create index if not exists order_document_download_audit_customer_idx on public.order_document_download_audit(instance_id,customer_id,created_at desc) where customer_id is not null;
create index if not exists order_document_download_audit_document_idx on public.order_document_download_audit(document_id,created_at desc) where document_id is not null;

alter table public.order_customer_documents enable row level security;
alter table public.order_document_download_audit enable row level security;
revoke all on public.order_customer_documents from public,anon,authenticated;
revoke all on public.order_document_download_audit from public,anon,authenticated;
revoke insert,update,delete on public.order_customer_documents from service_role;
revoke insert,update,delete on public.order_document_download_audit from service_role;
grant select on public.order_customer_documents to service_role;
grant select on public.order_document_download_audit to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'order-documents-private','order-documents-private',false,26214400,
  array[
    'application/pdf','image/jpeg','image/png','text/plain',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.admin_prepare_order_customer_document_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_order_id uuid,
  p_kind text,
  p_title text,
  p_description text,
  p_storage_path text,
  p_original_name text,
  p_media_type text,
  p_size_bytes bigint,
  p_checksum_sha256 text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_DOCUMENT_FORBIDDEN'; end if;
  if not exists(select 1 from public.orders o where o.id=p_order_id and o.instance_id=p_instance_id) then raise exception 'ORDER_DOCUMENT_ORDER_NOT_FOUND'; end if;
  if p_kind not in('invoice','warranty','certificate','service_record','merchant_attachment','other') then raise exception 'ORDER_DOCUMENT_KIND_INVALID'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 1 and 200 then raise exception 'ORDER_DOCUMENT_TITLE_INVALID'; end if;
  if char_length(coalesce(p_description,''))>2000 then raise exception 'ORDER_DOCUMENT_DESCRIPTION_INVALID'; end if;
  if char_length(trim(coalesce(p_original_name,''))) not between 1 and 255 then raise exception 'ORDER_DOCUMENT_NAME_INVALID'; end if;
  if p_media_type not in('application/pdf','image/jpeg','image/png','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document') then raise exception 'ORDER_DOCUMENT_MEDIA_TYPE_INVALID'; end if;
  if p_size_bytes<1 or p_size_bytes>26214400 then raise exception 'ORDER_DOCUMENT_SIZE_INVALID'; end if;
  if p_checksum_sha256 is not null and p_checksum_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'ORDER_DOCUMENT_CHECKSUM_INVALID'; end if;
  if p_storage_path is null or p_storage_path not like p_instance_id::text||'/'||p_order_id::text||'/%' or p_storage_path ~ '(^|/)\.\.(/|$)' then raise exception 'ORDER_DOCUMENT_PATH_INVALID'; end if;

  insert into public.order_customer_documents(
    instance_id,order_id,kind,title,description,storage_path,original_name,media_type,size_bytes,checksum_sha256,status,customer_visible,created_by
  ) values(
    p_instance_id,p_order_id,p_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_storage_path,trim(p_original_name),p_media_type,p_size_bytes,p_checksum_sha256,'pending',true,p_actor
  ) returning id into v_id;

  return pg_catalog.jsonb_build_object('documentId',v_id,'bucket','order-documents-private','path',p_storage_path,'status','pending');
end;
$$;

create or replace function public.admin_activate_order_customer_document_v1(
  p_instance_id uuid,p_actor uuid,p_document_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.order_customer_documents%rowtype;v_storage_count integer;
begin
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_DOCUMENT_FORBIDDEN'; end if;
  select * into v_doc from public.order_customer_documents where id=p_document_id and instance_id=p_instance_id for update;
  if not found then raise exception 'ORDER_DOCUMENT_NOT_FOUND'; end if;
  if v_doc.status='revoked' then raise exception 'ORDER_DOCUMENT_REVOKED'; end if;
  select count(*)::integer into v_storage_count from storage.objects where bucket_id=v_doc.storage_bucket and name=v_doc.storage_path;
  if v_storage_count<>1 then raise exception 'ORDER_DOCUMENT_STORAGE_OBJECT_MISSING'; end if;
  update public.order_customer_documents set status='active',activated_at=coalesce(activated_at,now()),revoked_at=null,updated_at=now()
  where id=v_doc.id and instance_id=p_instance_id;
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'status','active','path',v_doc.storage_path,'bucket',v_doc.storage_bucket);
end;
$$;

create or replace function public.admin_revoke_order_customer_document_v1(
  p_instance_id uuid,p_actor uuid,p_document_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.order_customer_documents%rowtype;
begin
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_DOCUMENT_FORBIDDEN'; end if;
  select * into v_doc from public.order_customer_documents where id=p_document_id and instance_id=p_instance_id for update;
  if not found then raise exception 'ORDER_DOCUMENT_NOT_FOUND'; end if;
  update public.order_customer_documents set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
  where id=v_doc.id and instance_id=p_instance_id;
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'status','revoked','path',v_doc.storage_path,'bucket',v_doc.storage_bucket);
end;
$$;

create or replace function public.list_account_order_documents_v1(
  p_instance_id uuid,p_customer_id uuid
) returns jsonb
language sql stable security definer set search_path=''
as $$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentId',d.id,
    'orderId',o.id,
    'orderNumber',o.order_number,
    'kind',d.kind,
    'title',d.title,
    'description',d.description,
    'fileName',d.original_name,
    'mediaType',d.media_type,
    'sizeBytes',d.size_bytes,
    'createdAt',d.created_at
  ) order by o.created_at desc,d.created_at desc),'[]'::jsonb)
  from public.order_customer_documents d
  join public.orders o on o.id=d.order_id and o.instance_id=d.instance_id
  where d.instance_id=p_instance_id and o.customer_id=p_customer_id and d.status='active' and d.customer_visible=true;
$$;

create or replace function public.authorize_order_customer_document_download_v1(
  p_instance_id uuid,
  p_document_id uuid,
  p_customer_id uuid,
  p_request_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc record;v_recent integer;
begin
  if p_customer_id is null then return null; end if;
  if p_request_fingerprint is not null and p_request_fingerprint !~ '^[a-f0-9]{64}$' then return null; end if;

  select d.id,d.order_id,d.storage_bucket,d.storage_path,d.original_name,d.media_type,d.size_bytes
  into v_doc
  from public.order_customer_documents d
  join public.orders o on o.id=d.order_id and o.instance_id=d.instance_id
  where d.id=p_document_id and d.instance_id=p_instance_id and d.status='active' and d.customer_visible=true and o.customer_id=p_customer_id;

  if not found then return null; end if;

  select count(*)::integer into v_recent
  from public.order_document_download_audit a
  where a.instance_id=p_instance_id and a.customer_id=p_customer_id and a.document_id=p_document_id and a.outcome='allowed' and a.created_at>now()-interval '1 hour';

  if v_recent>=60 then
    insert into public.order_document_download_audit(instance_id,order_id,document_id,customer_id,outcome,reason,request_fingerprint)
    values(p_instance_id,v_doc.order_id,p_document_id,p_customer_id,'denied','RATE_LIMIT',p_request_fingerprint);
    return null;
  end if;

  update public.order_customer_documents set download_count=download_count+1,last_download_at=now(),updated_at=now()
  where id=p_document_id and instance_id=p_instance_id;
  insert into public.order_document_download_audit(instance_id,order_id,document_id,customer_id,outcome,reason,request_fingerprint)
  values(p_instance_id,v_doc.order_id,p_document_id,p_customer_id,'allowed','AUTHORIZED',p_request_fingerprint);

  return pg_catalog.jsonb_build_object(
    'documentId',v_doc.id,
    'orderId',v_doc.order_id,
    'bucket',v_doc.storage_bucket,
    'path',v_doc.storage_path,
    'fileName',v_doc.original_name,
    'mediaType',v_doc.media_type,
    'sizeBytes',v_doc.size_bytes
  );
end;
$$;

revoke all on function public.admin_prepare_order_customer_document_v1(uuid,uuid,uuid,text,text,text,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.admin_activate_order_customer_document_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_revoke_order_customer_document_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_account_order_documents_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.authorize_order_customer_document_download_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_prepare_order_customer_document_v1(uuid,uuid,uuid,text,text,text,text,text,text,bigint,text) to service_role;
grant execute on function public.admin_activate_order_customer_document_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.admin_revoke_order_customer_document_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.list_account_order_documents_v1(uuid,uuid) to service_role;
grant execute on function public.authorize_order_customer_document_download_v1(uuid,uuid,uuid,text) to service_role;
