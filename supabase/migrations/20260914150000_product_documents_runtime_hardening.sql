-- Product Documents runtime hardening.
-- Keeps admin list access behind catalog.manage and avoids direct Data API dependency for the new table.

revoke all on function private.validate_product_document_scope_v1() from public,anon,authenticated;

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
revoke all on function public.admin_list_product_documents_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_list_product_documents_v1(uuid,uuid,uuid) to service_role;

comment on function public.admin_list_product_documents_v1(uuid,uuid,uuid)
is 'Catalog-manage scoped Product Documents admin projection. Keeps product document storage/data private from direct shopper roles.';
comment on function public.list_storefront_product_documents_v1(uuid,uuid,uuid)
is 'Storefront Product Documents projection for a canonical variant. Public documents are visible anonymously; account documents require trusted authenticated customer context.';
comment on function public.authorize_product_document_download_v1(uuid,uuid,uuid,uuid,text)
is 'Authorizes a short-lived Product Document delivery decision with product/variant scope, visibility gate, audit and bounded rate policy.';
