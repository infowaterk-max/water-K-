-- Product Documents post-purchase account authority.
-- Account-visible post-purchase documents require an eligible paid purchase of the matching product/variant.
-- Public documents and ordinary account-only documents keep their existing visibility semantics.

create or replace function public.list_storefront_product_documents_v1(
  p_instance_id uuid,p_variant_id uuid,p_customer_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_product_id uuid;v_variant_instance uuid;v_result jsonb;
begin
  select product_id,instance_id into v_product_id,v_variant_instance
  from public.product_variants
  where id=p_variant_id;
  if v_product_id is null or v_variant_instance<>p_instance_id then return '[]'::jsonb; end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentId',d.id,'kind',d.kind,'title',d.title,'description',d.description,'sortOrder',d.sort_order,
    'visibility',d.visibility,'fileName',d.original_name,'mediaType',d.media_type,'sizeBytes',d.size_bytes,
    'variantSpecific',d.variant_id is not null
  ) order by d.sort_order,d.created_at,d.id),'[]'::jsonb)
  into v_result
  from public.product_documents d
  where d.instance_id=p_instance_id
    and d.product_id=v_product_id
    and(d.variant_id is null or d.variant_id=p_variant_id)
    and d.status='active'
    and(
      d.visibility='public'
      or(
        d.visibility='account'
        and p_customer_id is not null
        and(
          d.post_purchase_delivery=false
          or exists(
            select 1
            from public.orders o
            join public.order_items oi
              on oi.order_id=o.id
             and oi.instance_id=o.instance_id
            join public.product_variants pv_purchase
              on pv_purchase.id=oi.variant_id
             and pv_purchase.instance_id=o.instance_id
            where o.instance_id=p_instance_id
              and o.customer_id=p_customer_id
              and o.status::text in('paid','processing','shipped','completed')
              and pv_purchase.product_id=d.product_id
              and(d.variant_id is null or oi.variant_id=d.variant_id)
          )
        )
      )
    );
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

  select product_id,instance_id into v_product_id,v_variant_instance
  from public.product_variants
  where id=p_variant_id;
  if v_product_id is null or v_variant_instance<>p_instance_id then return null; end if;

  select * into v_doc
  from public.product_documents
  where id=p_document_id
    and instance_id=p_instance_id
    and product_id=v_product_id
    and(variant_id is null or variant_id=p_variant_id)
    and status='active';
  if not found then return null; end if;

  if v_doc.visibility='account' and p_customer_id is null then return null; end if;

  if v_doc.visibility='account' and v_doc.post_purchase_delivery=true and not exists(
    select 1
    from public.orders o
    join public.order_items oi
      on oi.order_id=o.id
     and oi.instance_id=o.instance_id
    join public.product_variants pv_purchase
      on pv_purchase.id=oi.variant_id
     and pv_purchase.instance_id=o.instance_id
    where o.instance_id=p_instance_id
      and o.customer_id=p_customer_id
      and o.status::text in('paid','processing','shipped','completed')
      and pv_purchase.product_id=v_doc.product_id
      and(v_doc.variant_id is null or oi.variant_id=v_doc.variant_id)
  ) then
    return null;
  end if;

  v_actor:=case when p_customer_id is null then 'public' else 'account' end;

  select count(*)::integer into v_recent
  from public.product_document_download_audit
  where instance_id=p_instance_id
    and document_id=p_document_id
    and request_fingerprint=p_request_fingerprint
    and outcome='allowed'
    and created_at>now()-interval '1 hour';

  if v_recent>=60 then
    insert into public.product_document_download_audit(
      instance_id,document_id,product_id,variant_id,customer_id,actor_type,outcome,reason,request_fingerprint
    )
    values(
      p_instance_id,p_document_id,v_product_id,p_variant_id,p_customer_id,v_actor,'denied','RATE_LIMIT',p_request_fingerprint
    );
    return null;
  end if;

  insert into public.product_document_download_audit(
    instance_id,document_id,product_id,variant_id,customer_id,actor_type,outcome,reason,request_fingerprint
  )
  values(
    p_instance_id,p_document_id,v_product_id,p_variant_id,p_customer_id,v_actor,'allowed','AUTHORIZED',p_request_fingerprint
  );

  return pg_catalog.jsonb_build_object(
    'documentId',v_doc.id,
    'bucket',v_doc.storage_bucket,
    'path',v_doc.storage_path,
    'fileName',v_doc.original_name,
    'mediaType',v_doc.media_type,
    'sizeBytes',v_doc.size_bytes,
    'visibility',v_doc.visibility,
    'actorType',v_actor
  );
end;
$$;

revoke all on function public.list_storefront_product_documents_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.list_storefront_product_documents_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text) to service_role;

comment on function public.list_storefront_product_documents_v1(uuid,uuid,uuid)
is 'Storefront Product Documents projection. Public documents are anonymous; account post-purchase documents require an eligible paid purchase of the matching product/variant.';
comment on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text)
is 'Short-lived Product Document authorization. Account post-purchase documents require an eligible paid purchase; public and ordinary account-only semantics remain unchanged.';
