-- Visual Builder Global Design Tokens / Global Styles v1.
-- One tenant-wide style state is snapshotted into every Page Schema draft so
-- Preview / Publish / Rollback stay authoritative. This RPC has no publish path.

create or replace function public.save_storefront_global_style_drafts_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_global_styles jsonb,
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
  v_page_key text;
  v_page_type text;
  v_template_key text;
  v_template_version integer;
  v_schema_version integer;
  v_document_sha256 text;
  v_expected_draft_revision integer;
  v_seen_keys text[] := array[]::text[];
  v_index integer := 0;
  v_org uuid;
  v_key text;
  v_value text;
begin
  if p_instance_id is null or p_actor_user_id is null then raise exception 'STOREFRONT_IDENTITY_REQUIRED'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$' then raise exception 'STOREFRONT_GLOBAL_STYLES_OPERATION_KEY_INVALID'; end if;
  if p_pages is null or jsonb_typeof(p_pages)<>'array' or jsonb_array_length(p_pages)<1 or jsonb_array_length(p_pages)>32 then raise exception 'STOREFRONT_GLOBAL_STYLES_PAGES_INVALID'; end if;
  if p_global_styles is null
     or jsonb_typeof(p_global_styles)<>'object'
     or coalesce(p_global_styles->>'version','')<>'shoporation.storefront-global-styles.v1'
     or coalesce(jsonb_typeof(p_global_styles->'tokens'),'')<>'object' then
    raise exception 'STOREFRONT_GLOBAL_STYLES_STATE_INVALID';
  end if;
  if jsonb_object_length(p_global_styles->'tokens')>16 then raise exception 'STOREFRONT_GLOBAL_STYLES_TOKENS_TOO_LARGE'; end if;

  for v_key in select jsonb_object_keys(p_global_styles->'tokens') loop
    if v_key<>all(array['background','surface','surfaceMuted','text','mutedText','border','primary','primaryContrast','accent','headingFont','bodyFont','spacingScale','radiusScale']) then
      raise exception 'STOREFRONT_GLOBAL_STYLES_TOKEN_UNKNOWN';
    end if;
  end loop;
  for v_key in select unnest(array['background','surface','surfaceMuted','text','mutedText','border','primary','primaryContrast','accent']) loop
    if p_global_styles->'tokens' ? v_key then
      v_value:=p_global_styles->'tokens'->>v_key;
      if v_value is null or v_value !~ '^#[0-9a-fA-F]{6}$' then raise exception 'STOREFRONT_GLOBAL_STYLES_COLOR_INVALID'; end if;
    end if;
  end loop;
  if p_global_styles->'tokens' ? 'headingFont' and coalesce(p_global_styles->'tokens'->>'headingFont','')<>all(array['system-sans','humanist-sans','geometric-sans','editorial-serif','monospace']) then raise exception 'STOREFRONT_GLOBAL_STYLES_HEADING_FONT_INVALID'; end if;
  if p_global_styles->'tokens' ? 'bodyFont' and coalesce(p_global_styles->'tokens'->>'bodyFont','')<>all(array['system-sans','humanist-sans','geometric-sans','editorial-serif','monospace']) then raise exception 'STOREFRONT_GLOBAL_STYLES_BODY_FONT_INVALID'; end if;
  if p_global_styles->'tokens' ? 'spacingScale' and coalesce(p_global_styles->'tokens'->>'spacingScale','')<>all(array['compact','comfortable','airy']) then raise exception 'STOREFRONT_GLOBAL_STYLES_SPACING_INVALID'; end if;
  if p_global_styles->'tokens' ? 'radiusScale' and coalesce(p_global_styles->'tokens'->>'radiusScale','')<>all(array['sharp','soft','rounded']) then raise exception 'STOREFRONT_GLOBAL_STYLES_RADIUS_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  perform pg_advisory_xact_lock(hashtextextended('storefront-global-styles:'||p_instance_id::text||':'||p_operation_key,0));
  select after_state into v_existing
  from public.admin_audit_log
  where instance_id=p_instance_id
    and action='storefront.global_style_drafts_materialized'
    and metadata->>'operationKey'=p_operation_key
  order by created_at desc limit 1;
  if found then
    if v_existing->'globalStyles' is distinct from p_global_styles
       or coalesce(v_existing->>'pageCount','') !~ '^[0-9]+$'
       or (v_existing->>'pageCount')::integer<>jsonb_array_length(p_pages)
       or coalesce(jsonb_typeof(v_existing->'pages'),'')<>'array'
       or jsonb_array_length(v_existing->'pages')<>jsonb_array_length(p_pages) then
      raise exception 'STOREFRONT_GLOBAL_STYLES_OPERATION_KEY_CONFLICT';
    end if;
    for v_index in 0..(jsonb_array_length(p_pages)-1) loop
      if coalesce(v_existing->'pages'->v_index->>'documentSha256','')<>coalesce(p_pages->v_index->>'documentSha256','') then raise exception 'STOREFRONT_GLOBAL_STYLES_OPERATION_KEY_CONFLICT'; end if;
    end loop;
    return v_existing||jsonb_build_object('replayed',true);
  end if;

  for v_item in select value from jsonb_array_elements(p_pages) as rows(value) loop
    v_index:=v_index+1;
    if jsonb_typeof(v_item)<>'object' then raise exception 'STOREFRONT_GLOBAL_STYLES_PAGE_INVALID'; end if;
    v_page_key:=v_item->>'pageKey';
    v_page_type:=v_item->>'pageType';
    v_template_key:=v_item->>'templateKey';
    v_document_sha256:=v_item->>'documentSha256';
    if v_page_key is null or v_page_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then raise exception 'STOREFRONT_GLOBAL_STYLES_PAGE_KEY_INVALID'; end if;
    if v_page_key=any(v_seen_keys) then raise exception 'STOREFRONT_GLOBAL_STYLES_PAGE_KEY_DUPLICATE'; end if;
    v_seen_keys:=array_append(v_seen_keys,v_page_key);
    if v_page_type is null or char_length(v_page_type)<1 then raise exception 'STOREFRONT_GLOBAL_STYLES_PAGE_TYPE_INVALID'; end if;
    if v_template_key is null or v_template_key !~ '^[a-z0-9]+([.-][a-z0-9]+)*$' then raise exception 'STOREFRONT_GLOBAL_STYLES_TEMPLATE_KEY_INVALID'; end if;
    if coalesce(v_item->>'templateVersion','') !~ '^[0-9]+$' then raise exception 'STOREFRONT_GLOBAL_STYLES_TEMPLATE_VERSION_INVALID'; end if;
    v_template_version:=(v_item->>'templateVersion')::integer;
    if v_template_version<1 then raise exception 'STOREFRONT_GLOBAL_STYLES_TEMPLATE_VERSION_INVALID'; end if;
    if coalesce(v_item->>'schemaVersion','') !~ '^[0-9]+$' then raise exception 'STOREFRONT_GLOBAL_STYLES_SCHEMA_VERSION_INVALID'; end if;
    v_schema_version:=(v_item->>'schemaVersion')::integer;
    if v_schema_version<1 then raise exception 'STOREFRONT_GLOBAL_STYLES_SCHEMA_VERSION_INVALID'; end if;
    if v_document_sha256 is null or v_document_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'STOREFRONT_DOCUMENT_HASH_INVALID'; end if;
    if v_item->'document' is null or jsonb_typeof(v_item->'document')<>'object' then raise exception 'STOREFRONT_GLOBAL_STYLES_DOCUMENT_INVALID'; end if;
    if v_item->'document'->'metadata'->'shoporationGlobalStyles' is distinct from p_global_styles then raise exception 'STOREFRONT_GLOBAL_STYLES_DOCUMENT_MISMATCH'; end if;

    v_expected_draft_revision:=null;
    if v_item ? 'expectedDraftRevision' and v_item->'expectedDraftRevision'<>'null'::jsonb then
      if coalesce(v_item->>'expectedDraftRevision','') !~ '^[0-9]+$' then raise exception 'STOREFRONT_GLOBAL_STYLES_EXPECTED_REVISION_INVALID'; end if;
      v_expected_draft_revision:=(v_item->>'expectedDraftRevision')::integer;
      if v_expected_draft_revision<1 then raise exception 'STOREFRONT_GLOBAL_STYLES_EXPECTED_REVISION_INVALID'; end if;
    end if;

    v_result:=public.save_storefront_page_draft_v1(
      p_instance_id,p_actor_user_id,v_page_key,v_page_type,v_schema_version,
      v_template_key,v_template_version,v_item->'document',v_document_sha256,
      v_expected_draft_revision,p_operation_key||':g'||lpad(v_index::text,2,'0')
    );
    v_results:=v_results||jsonb_build_array(v_result);
  end loop;

  v_after:=jsonb_build_object(
    'globalStyles',p_global_styles,
    'pageCount',jsonb_array_length(p_pages),
    'pages',v_results,
    'mutationScope','storefront_page_drafts_only'
  );
  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.global_style_drafts_materialized','storefront_global_styles',p_instance_id::text,v_org,p_instance_id,
    'Storefront globális design tokenek atomikusan minden oldal draftjára materializálva',v_after,
    jsonb_build_object('audit_source','database_rpc','rpc','save_storefront_global_style_drafts_v1','operationKey',p_operation_key,'mutationScope','storefront_page_drafts_only')
  );
  return v_after||jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.save_storefront_global_style_drafts_v1(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_storefront_global_style_drafts_v1(uuid,uuid,jsonb,jsonb,text) to service_role;
comment on function public.save_storefront_global_style_drafts_v1(uuid,uuid,jsonb,jsonb,text) is 'Atomically snapshots one validated tenant-wide global style state into Page Schema drafts only. It has no publish authority.';
