-- Product Documents merchant workflow integration.
-- Keeps Product Documents separate from invoices and order/customer-specific documents,
-- while making post-purchase delivery an explicit product-level merchant choice.

alter table public.product_documents
  add column if not exists post_purchase_delivery boolean not null default false;

comment on column public.product_documents.post_purchase_delivery
is 'When true, the document is offered automatically after an eligible paid order containing the matching product/variant.';

create index if not exists product_documents_post_purchase_idx
on public.product_documents(instance_id,product_id,variant_id,sort_order,created_at)
where status='active' and post_purchase_delivery=true;

-- The server-side payment-confirmed email and order confirmation page both need
-- the canonical order/order-item read set. Keep it explicit for service-role clients.
grant select on table public.orders to service_role;
grant select on table public.order_items to service_role;

create or replace function public.admin_prepare_product_document_v2(
  p_instance_id uuid,p_actor uuid,p_document_id uuid,p_product_id uuid,p_variant_id uuid,
  p_kind text,p_title text,p_description text,p_sort_order integer,p_visibility text,
  p_post_purchase_delivery boolean,
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
    id,instance_id,product_id,variant_id,kind,title,description,sort_order,visibility,post_purchase_delivery,
    storage_path,original_name,media_type,size_bytes,checksum_sha256,status,created_by
  ) values(
    p_document_id,p_instance_id,p_product_id,p_variant_id,p_kind,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
    p_sort_order,p_visibility,coalesce(p_post_purchase_delivery,false),p_storage_path,trim(p_original_name),p_media_type,p_size_bytes,p_checksum_sha256,'pending',p_actor
  );
  return pg_catalog.jsonb_build_object('documentId',p_document_id,'bucket','product-documents-private','path',p_storage_path,'status','pending');
end;
$$;

revoke all on function public.admin_prepare_product_document_v2(uuid,uuid,uuid,uuid,uuid,text,text,text,integer,text,boolean,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.admin_prepare_product_document_v2(uuid,uuid,uuid,uuid,uuid,text,text,text,integer,text,boolean,text,text,text,bigint,text) to service_role;

create or replace function public.admin_list_product_documents_v1(
  p_instance_id uuid,p_actor uuid,p_product_id uuid
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'PRODUCT_DOCUMENT_FORBIDDEN'; end if;
  if not exists(select 1 from public.products p where p.id=p_product_id and p.instance_id=p_instance_id) then raise exception 'PRODUCT_DOCUMENT_PRODUCT_NOT_FOUND'; end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentId',d.id,
    'variantId',d.variant_id,
    'variantLabel',v.label,
    'kind',d.kind,
    'title',d.title,
    'description',d.description,
    'sortOrder',d.sort_order,
    'visibility',d.visibility,
    'postPurchaseDelivery',d.post_purchase_delivery,
    'fileName',d.original_name,
    'mediaType',d.media_type,
    'sizeBytes',d.size_bytes,
    'status',d.status,
    'createdAt',d.created_at
  ) order by d.sort_order,d.created_at desc,d.id),'[]'::jsonb)
  into v_result
  from public.product_documents d
  left join public.product_variants v on v.id=d.variant_id and v.instance_id=d.instance_id and v.product_id=d.product_id
  where d.instance_id=p_instance_id and d.product_id=p_product_id;
  return coalesce(v_result,'[]'::jsonb);
end;
$$;

create or replace function public.list_order_product_documents_v1(
  p_instance_id uuid,p_order_id uuid,p_confirmation_token uuid
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
  if not exists(
    select 1 from public.orders o
    where o.id=p_order_id and o.instance_id=p_instance_id and o.confirmation_token=p_confirmation_token
      and o.status in('paid','processing','shipped','completed')
  ) then return '[]'::jsonb; end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentId',x.document_id,
    'variantId',x.variant_id,
    'productName',x.product_name,
    'variantLabel',x.variant_label,
    'kind',x.kind,
    'title',x.title,
    'fileName',x.file_name,
    'mediaType',x.media_type,
    'sizeBytes',x.size_bytes
  ) order by x.sort_order,x.title,x.document_id),'[]'::jsonb)
  into v_result
  from(
    select distinct on(d.id)
      d.id as document_id,oi.variant_id,oi.product_name,oi.variant_label,d.kind,d.title,d.original_name as file_name,
      d.media_type,d.size_bytes,d.sort_order
    from public.order_items oi
    join public.product_variants pv on pv.id=oi.variant_id and pv.instance_id=p_instance_id
    join public.product_documents d on d.instance_id=p_instance_id and d.product_id=pv.product_id
      and(d.variant_id is null or d.variant_id=oi.variant_id)
    where oi.instance_id=p_instance_id and oi.order_id=p_order_id
      and d.status='active' and d.post_purchase_delivery=true
    order by d.id,d.sort_order,d.created_at
  ) x;
  return coalesce(v_result,'[]'::jsonb);
end;
$$;

revoke all on function public.list_order_product_documents_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_order_product_documents_v1(uuid,uuid,uuid) to service_role;

alter table public.product_document_download_audit
  drop constraint if exists product_document_download_audit_actor_type_check;
alter table public.product_document_download_audit
  add constraint product_document_download_audit_actor_type_check
  check(actor_type in('public','account','order','system'));

create or replace function public.authorize_order_product_document_download_v1(
  p_instance_id uuid,p_document_id uuid,p_order_id uuid,p_variant_id uuid,p_confirmation_token uuid,p_request_fingerprint text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_doc public.product_documents%rowtype;v_product_id uuid;v_recent integer;
begin
  if p_request_fingerprint is null or p_request_fingerprint !~ '^[a-f0-9]{64}$' then return null; end if;
  if not exists(
    select 1 from public.orders o
    where o.id=p_order_id and o.instance_id=p_instance_id and o.confirmation_token=p_confirmation_token
      and o.status in('paid','processing','shipped','completed')
  ) then return null; end if;
  if not exists(
    select 1 from public.order_items oi where oi.instance_id=p_instance_id and oi.order_id=p_order_id and oi.variant_id=p_variant_id
  ) then return null; end if;
  select product_id into v_product_id from public.product_variants where id=p_variant_id and instance_id=p_instance_id;
  if v_product_id is null then return null; end if;
  select * into v_doc from public.product_documents
  where id=p_document_id and instance_id=p_instance_id and product_id=v_product_id
    and(variant_id is null or variant_id=p_variant_id) and status='active' and post_purchase_delivery=true;
  if not found then return null; end if;
  select count(*)::integer into v_recent from public.product_document_download_audit
  where instance_id=p_instance_id and document_id=p_document_id and request_fingerprint=p_request_fingerprint
    and outcome='allowed' and created_at>now()-interval '1 hour';
  if v_recent>=60 then
    insert into public.product_document_download_audit(instance_id,document_id,product_id,variant_id,actor_type,outcome,reason,request_fingerprint)
    values(p_instance_id,p_document_id,v_product_id,p_variant_id,'order','denied','RATE_LIMIT',p_request_fingerprint);
    return null;
  end if;
  insert into public.product_document_download_audit(instance_id,document_id,product_id,variant_id,actor_type,outcome,reason,request_fingerprint)
  values(p_instance_id,p_document_id,v_product_id,p_variant_id,'order','allowed','ORDER_AUTHORIZED',p_request_fingerprint);
  return pg_catalog.jsonb_build_object('documentId',v_doc.id,'bucket',v_doc.storage_bucket,'path',v_doc.storage_path,'fileName',v_doc.original_name,'mediaType',v_doc.media_type,'sizeBytes',v_doc.size_bytes,'actorType','order');
end;
$$;

revoke all on function public.authorize_order_product_document_download_v1(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.authorize_order_product_document_download_v1(uuid,uuid,uuid,uuid,uuid,text) to service_role;
