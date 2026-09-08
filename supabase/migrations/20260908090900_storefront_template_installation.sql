-- Storefront Runtime Wave 0D: atomic multi-page template draft materialization.
--
-- This migration is code-only on the runtime branch. It depends on the Wave 0B
-- persistence migration and does not switch any live storefront route or mutate
-- catalog/customer/order/business data.

create or replace function public.save_storefront_template_drafts_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_template_key text,
  p_template_version integer,
  p_pages jsonb,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_item jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_after jsonb;
  v_existing jsonb;
  v_seen_keys text[] := array[]::text[];
  v_seen_types text[] := array[]::text[];
  v_page_key text;
  v_page_type text;
  v_schema_version integer;
  v_document_sha256 text;
  v_expected_draft_revision integer;
  v_index integer := 0;
  v_org uuid;
begin
  if p_instance_id is null or p_actor_user_id is null then
    raise exception 'STOREFRONT_IDENTITY_REQUIRED';
  end if;
  if p_template_key is null or p_template_key !~ '^[a-z0-9]+([.-][a-z0-9]+)*$' then
    raise exception 'STOREFRONT_TEMPLATE_KEY_INVALID';
  end if;
  if p_template_version is null or p_template_version<1 then
    raise exception 'STOREFRONT_TEMPLATE_VERSION_INVALID';
  end if;
  if p_operation_key is null
     or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$' then
    raise exception 'STOREFRONT_TEMPLATE_OPERATION_KEY_INVALID';
  end if;
  if p_pages is null or jsonb_typeof(p_pages)<>'array'
     or jsonb_array_length(p_pages)<1 or jsonb_array_length(p_pages)>32 then
    raise exception 'STOREFRONT_TEMPLATE_PAGES_INVALID';
  end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then
    raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  -- Parent-operation idempotency. A successful template materialization is replayed
  -- as one logical operation; callers cannot append/reorder pages under the same key.
  select after_state into v_existing
  from public.admin_audit_log
  where instance_id=p_instance_id
    and action='storefront.template_drafts_materialized'
    and metadata->>'operationKey'=p_operation_key
  order by created_at desc
  limit 1;

  if found then
    if coalesce(v_existing->>'templateKey','')<>p_template_key
       or coalesce(v_existing->>'templateVersion','') !~ '^[0-9]+$'
       or (v_existing->>'templateVersion')::integer<>p_template_version
       or coalesce(v_existing->>'pageCount','') !~ '^[0-9]+$'
       or (v_existing->>'pageCount')::integer<>jsonb_array_length(p_pages) then
      raise exception 'STOREFRONT_TEMPLATE_OPERATION_KEY_CONFLICT';
    end if;
    return v_existing || jsonb_build_object('replayed',true);
  end if;

  for v_item in select value from jsonb_array_elements(p_pages) as page_rows(value)
  loop
    v_index:=v_index+1;
    if jsonb_typeof(v_item)<>'object' then raise exception 'STOREFRONT_TEMPLATE_PAGE_INVALID'; end if;

    v_page_key:=v_item->>'pageKey';
    v_page_type:=v_item->>'pageType';
    v_document_sha256:=v_item->>'documentSha256';

    if v_page_key is null or v_page_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then
      raise exception 'STOREFRONT_TEMPLATE_PAGE_KEY_INVALID';
    end if;
    if v_page_type is null then raise exception 'STOREFRONT_TEMPLATE_PAGE_TYPE_INVALID'; end if;
    if v_page_key=any(v_seen_keys) then raise exception 'STOREFRONT_TEMPLATE_PAGE_KEY_DUPLICATE'; end if;
    if v_page_type=any(v_seen_types) then raise exception 'STOREFRONT_TEMPLATE_PAGE_TYPE_DUPLICATE'; end if;
    v_seen_keys:=array_append(v_seen_keys,v_page_key);
    v_seen_types:=array_append(v_seen_types,v_page_type);

    if coalesce(v_item->>'schemaVersion','') !~ '^[0-9]+$' then
      raise exception 'STOREFRONT_TEMPLATE_PAGE_SCHEMA_INVALID';
    end if;
    v_schema_version:=(v_item->>'schemaVersion')::integer;
    if v_schema_version<1 then raise exception 'STOREFRONT_TEMPLATE_PAGE_SCHEMA_INVALID'; end if;
    if v_document_sha256 is null or v_document_sha256 !~ '^[0-9a-f]{64}$' then
      raise exception 'STOREFRONT_DOCUMENT_HASH_INVALID';
    end if;
    if v_item->'document' is null or jsonb_typeof(v_item->'document')<>'object' then
      raise exception 'STOREFRONT_TEMPLATE_PAGE_DOCUMENT_INVALID';
    end if;

    v_expected_draft_revision:=null;
    if v_item ? 'expectedDraftRevision' and v_item->'expectedDraftRevision'<>'null'::jsonb then
      if coalesce(v_item->>'expectedDraftRevision','') !~ '^[0-9]+$' then
        raise exception 'STOREFRONT_TEMPLATE_EXPECTED_REVISION_INVALID';
      end if;
      v_expected_draft_revision:=(v_item->>'expectedDraftRevision')::integer;
      if v_expected_draft_revision<1 then raise exception 'STOREFRONT_TEMPLATE_EXPECTED_REVISION_INVALID'; end if;
    end if;

    -- Calling the single-page RPC inside this function keeps all page drafts in the
    -- same PostgreSQL transaction. Any later failure rolls the complete switch back.
    v_result:=public.save_storefront_page_draft_v1(
      p_instance_id,
      p_actor_user_id,
      v_page_key,
      v_page_type,
      v_schema_version,
      p_template_key,
      p_template_version,
      v_item->'document',
      v_document_sha256,
      v_expected_draft_revision,
      p_operation_key||':p'||lpad(v_index::text,2,'0')
    );
    v_results:=v_results||jsonb_build_array(v_result);
  end loop;

  v_after:=jsonb_build_object(
    'templateKey',p_template_key,
    'templateVersion',p_template_version,
    'pageCount',jsonb_array_length(p_pages),
    'pages',v_results,
    'mutationScope','storefront_page_drafts_only'
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,
    'storefront.template_drafts_materialized',
    'storefront_template',
    p_template_key||'@'||p_template_version::text,
    v_org,
    p_instance_id,
    'Storefront sablon oldalvázlatok atomikusan materializálva',
    v_after,
    jsonb_build_object(
      'audit_source','database_rpc',
      'rpc','save_storefront_template_drafts_v1',
      'operationKey',p_operation_key,
      'mutationScope','storefront_page_drafts_only'
    )
  );

  return v_after||jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.save_storefront_template_drafts_v1(uuid,uuid,text,integer,jsonb,text)
from public,anon,authenticated;
grant execute on function public.save_storefront_template_drafts_v1(uuid,uuid,text,integer,jsonb,text)
to service_role;
