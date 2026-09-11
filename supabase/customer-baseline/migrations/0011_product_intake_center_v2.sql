-- Product Intake Center v2
-- Product copy authority + CSV/XLSX onboarding source support.
-- AI Product Copilot is application-side suggestion-only and does not mutate database state.

alter table public.catalog_onboarding_batches drop constraint if exists catalog_onboarding_batches_source_type_check;
alter table public.catalog_onboarding_batches
  add constraint catalog_onboarding_batches_source_type_check check(source_type in ('manual','csv','xlsx','copy'));

create or replace function public.apply_catalog_onboarding_batch_v1(
  p_instance_id uuid,p_batch_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_batch public.catalog_onboarding_batches%rowtype;v_row jsonb;v_product_id uuid;v_variant_id uuid;
  v_category_id uuid;v_category_name text;v_category_slug text;v_attr record;v_results jsonb:='[]'::jsonb;
begin
  if p_instance_id is null or p_batch_id is null or p_actor is null then raise exception 'CATALOG_ONBOARDING_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  select * into v_batch from public.catalog_onboarding_batches where id=p_batch_id and instance_id=p_instance_id for update;
  if not found or v_batch.source_type not in('csv','xlsx') then raise exception 'CATALOG_ONBOARDING_BATCH_INVALID';end if;
  if v_batch.created_by<>p_actor then raise exception 'CATALOG_ONBOARDING_BATCH_ACTOR_MISMATCH';end if;
  if v_batch.state='applied' then return coalesce(v_batch.result,'[]'::jsonb);end if;
  if jsonb_array_length(v_batch.apply_plan)=0 then raise exception 'CATALOG_ONBOARDING_EMPTY_PLAN';end if;
  for v_row in select value from jsonb_array_elements(v_batch.apply_plan) loop
    insert into public.products(instance_id,slug,name,short_description,description,seo_title,seo_description,active,audience,featured)
    values(p_instance_id,v_row->>'slug',v_row->>'name',nullif(v_row->>'shortDescription',''),nullif(v_row->>'description',''),nullif(v_row->>'seoTitle',''),nullif(v_row->>'seoDescription',''),false,'retail',false)
    returning id into v_product_id;
    insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active)
    values(p_instance_id,v_product_id,v_row->>'sku',coalesce(nullif(v_row->>'variantLabel',''),v_row->>'name'),(v_row->>'netPrice')::integer,(v_row->>'grossPrice')::integer,coalesce((v_row->>'stock')::integer,0),false)
    returning id into v_variant_id;
    v_category_name:=nullif(trim(v_row->>'category'),'');v_category_slug:=nullif(trim(v_row->>'categorySlug'),'');
    if v_category_name is not null and v_category_slug is not null then
      insert into public.catalog_categories(instance_id,name,slug) values(p_instance_id,v_category_name,v_category_slug)
      on conflict(instance_id,slug) do update set name=excluded.name,updated_at=now() returning id into v_category_id;
      insert into public.product_category_assignments(instance_id,product_id,category_id) values(p_instance_id,v_product_id,v_category_id) on conflict do nothing;
    end if;
    if jsonb_typeof(coalesce(v_row->'attributes','{}'::jsonb))='object' then
      for v_attr in select key,value from jsonb_each_text(coalesce(v_row->'attributes','{}'::jsonb)) loop
        if nullif(trim(v_attr.key),'') is not null and nullif(trim(v_attr.value),'') is not null then
          insert into public.product_attributes(instance_id,product_id,name,value) values(p_instance_id,v_product_id,trim(v_attr.key),trim(v_attr.value));
        end if;
      end loop;
    end if;
    v_results:=v_results||jsonb_build_array(jsonb_build_object('line',coalesce((v_row->>'line')::integer,0),'productId',v_product_id,'variantId',v_variant_id,'draft',true));
  end loop;
  update public.catalog_onboarding_batches set state='applied',result=v_results,applied_at=now() where id=v_batch.id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,case when v_batch.source_type='xlsx' then 'catalog.xlsx_onboarding_applied' else 'catalog.csv_onboarding_applied' end,'catalog_onboarding_batch',v_batch.id::text,v_org,p_instance_id,
    upper(v_batch.source_type)||' termék-onboarding alkalmazva: '||jsonb_array_length(v_results)||' piszkozat',v_results,jsonb_build_object('audit_source','database_rpc','source',v_batch.source_type,'batch_id',v_batch.id,'error_count',v_batch.error_count));
  return v_results;
end;$$;
revoke all on function public.apply_catalog_onboarding_batch_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_catalog_onboarding_batch_v1(uuid,uuid,uuid) to service_role;

create or replace function public.prepare_catalog_product_copy_v1(
  p_instance_id uuid,p_source_product_id uuid,p_actor uuid,p_idempotency_key text,p_payload_hash text,p_options jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_batch public.catalog_onboarding_batches%rowtype;v_source public.products%rowtype;v_target_id uuid;v_target_updated_at timestamptz;
  v_variant public.product_variants%rowtype;v_target_variant_id uuid;v_variant_map jsonb:='[]'::jsonb;v_options jsonb:=coalesce(p_options,'{}'::jsonb);
  v_include_media boolean:=coalesce((v_options->>'includeMedia')::boolean,true);v_include_seo boolean:=coalesce((v_options->>'includeSeo')::boolean,true);
  v_include_channels boolean:=coalesce((v_options->>'includeChannels')::boolean,true);v_include_stock boolean:=coalesce((v_options->>'includeStock')::boolean,false);
  v_slug_base text;v_slug text;v_sku_base text;v_sku text;v_seq integer;v_result jsonb;
begin
  if p_instance_id is null or p_source_product_id is null or p_actor is null or nullif(trim(p_idempotency_key),'') is null then raise exception 'CATALOG_COPY_IDENTITY_REQUIRED';end if;
  if p_payload_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(v_options)<>'object' then raise exception 'CATALOG_COPY_PAYLOAD_INVALID';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  select * into v_source from public.products where id=p_source_product_id and instance_id=p_instance_id;if not found then raise exception 'PRODUCT_NOT_FOUND';end if;
  if(select count(*) from public.product_variants where instance_id=p_instance_id and product_id=p_source_product_id)>100 then raise exception 'CATALOG_COPY_TOO_MANY_VARIANTS';end if;
  insert into public.catalog_onboarding_batches(instance_id,created_by,source_type,idempotency_key,payload_hash,preview_rows,apply_plan)
  values(p_instance_id,p_actor,'copy',p_idempotency_key,p_payload_hash,jsonb_build_array(jsonb_build_object('sourceProductId',p_source_product_id,'options',v_options)),jsonb_build_array(jsonb_build_object('sourceProductId',p_source_product_id,'options',v_options)))
  on conflict(instance_id,idempotency_key) do nothing;
  select * into v_batch from public.catalog_onboarding_batches where instance_id=p_instance_id and idempotency_key=p_idempotency_key for update;
  if not found or v_batch.source_type<>'copy' then raise exception 'CATALOG_COPY_BATCH_INVALID';end if;
  if v_batch.created_by<>p_actor then raise exception 'CATALOG_COPY_ACTOR_MISMATCH';end if;
  if v_batch.payload_hash<>p_payload_hash then raise exception 'CATALOG_COPY_IDEMPOTENCY_CONFLICT';end if;
  if v_batch.result is not null then return v_batch.result;end if;

  v_slug_base:=left(v_source.slug,100)||'-masolat';v_slug:=v_slug_base;v_seq:=1;
  while exists(select 1 from public.products where instance_id=p_instance_id and slug=v_slug) loop v_seq:=v_seq+1;v_slug:=left(v_slug_base,110)||'-'||v_seq::text;if v_seq>999 then raise exception 'CATALOG_COPY_SLUG_EXHAUSTED';end if;end loop;
  insert into public.products(instance_id,slug,name,short_description,description,seo_title,seo_description,active,audience,featured,use_cases,highlights)
  values(p_instance_id,v_slug,left(v_source.name||' – másolat',200),v_source.short_description,v_source.description,case when v_include_seo then v_source.seo_title else null end,case when v_include_seo then v_source.seo_description else null end,false,v_source.audience,v_source.featured,v_source.use_cases,v_source.highlights)
  returning id,updated_at into v_target_id,v_target_updated_at;

  for v_variant in select * from public.product_variants where instance_id=p_instance_id and product_id=p_source_product_id order by created_at,id loop
    v_sku_base:=left(v_variant.sku,105)||'-M';v_seq:=1;v_sku:=v_sku_base||v_seq::text;
    while exists(select 1 from public.product_variants where instance_id=p_instance_id and lower(sku)=lower(v_sku)) loop v_seq:=v_seq+1;v_sku:=v_sku_base||v_seq::text;if v_seq>9999 then raise exception 'CATALOG_COPY_SKU_EXHAUSTED';end if;end loop;
    insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active,reseller_net_price_huf,reseller_gross_price_huf,unit_cost_net_huf,supplier_lead_time_days,safety_stock_days,minimum_order_quantity,order_multiple,supplier_id,weight_grams,primary_media_id)
    values(p_instance_id,v_target_id,v_sku,v_variant.label,v_variant.net_price_huf,v_variant.gross_price_huf,case when v_include_stock then v_variant.stock_quantity else 0 end,v_variant.active,v_variant.reseller_net_price_huf,v_variant.reseller_gross_price_huf,v_variant.unit_cost_net_huf,v_variant.supplier_lead_time_days,v_variant.safety_stock_days,v_variant.minimum_order_quantity,v_variant.order_multiple,v_variant.supplier_id,v_variant.weight_grams,null)
    returning id into v_target_variant_id;
    v_variant_map:=v_variant_map||jsonb_build_array(jsonb_build_object('sourceVariantId',v_variant.id,'targetVariantId',v_target_variant_id,'sourcePrimaryMediaId',v_variant.primary_media_id));
  end loop;
  if jsonb_array_length(v_variant_map)=0 then raise exception 'CATALOG_COPY_NO_VARIANTS';end if;

  insert into public.product_attributes(instance_id,product_id,name,value)
    select p_instance_id,v_target_id,name,value from public.product_attributes where instance_id=p_instance_id and product_id=p_source_product_id;
  insert into public.product_category_assignments(instance_id,product_id,category_id)
    select p_instance_id,v_target_id,category_id from public.product_category_assignments where instance_id=p_instance_id and product_id=p_source_product_id on conflict do nothing;
  if v_include_channels then
    insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,gross_price,minimum_quantity,discount_percent,settings,updated_at)
      select p_instance_id,v_target_id,channel_code,visible,gross_price,minimum_quantity,discount_percent,settings,now() from public.product_channel_settings where instance_id=p_instance_id and product_id=p_source_product_id
      on conflict(instance_id,product_id,channel_code) do update set visible=excluded.visible,gross_price=excluded.gross_price,minimum_quantity=excluded.minimum_quantity,discount_percent=excluded.discount_percent,settings=excluded.settings,updated_at=excluded.updated_at;
  else
    insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,updated_at) values(p_instance_id,v_target_id,'b2c',true,now()),(p_instance_id,v_target_id,'b2b',false,now())
      on conflict(instance_id,product_id,channel_code) do update set visible=excluded.visible,updated_at=excluded.updated_at;
  end if;

  v_result:=jsonb_build_object('batchId',v_batch.id,'sourceProductId',p_source_product_id,'targetProductId',v_target_id,'variantMap',v_variant_map,'includeMedia',v_include_media,'applied',not v_include_media,'draft',true,'updatedAt',v_target_updated_at);
  update public.catalog_onboarding_batches set result=v_result,state=case when v_include_media then 'preview' else 'applied' end,applied_at=case when v_include_media then null else now() end where id=v_batch.id;
  if not v_include_media then
    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
    values(p_actor,'catalog.product_copied','product',v_target_id::text,v_org,p_instance_id,v_source.name||' másolata piszkozatként létrejött',v_result,jsonb_build_object('audit_source','database_rpc','source_product_id',p_source_product_id,'include_media',false,'include_stock',v_include_stock));
  end if;
  return v_result;
end;$$;
revoke all on function public.prepare_catalog_product_copy_v1(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_catalog_product_copy_v1(uuid,uuid,uuid,text,text,jsonb) to service_role;

create or replace function public.finalize_catalog_product_copy_media_v1(
  p_instance_id uuid,p_batch_id uuid,p_actor uuid,p_media_manifest jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_batch public.catalog_onboarding_batches%rowtype;v_source_id uuid;v_target_id uuid;v_expected integer;v_row jsonb;v_map jsonb;
  v_source_media_id uuid;v_source_media public.product_media%rowtype;v_target_media_id uuid;v_media_map jsonb:='{}'::jsonb;v_path text;v_upload_key text;v_source_primary text;v_target_variant uuid;v_result jsonb;
begin
  if p_instance_id is null or p_batch_id is null or p_actor is null or p_media_manifest is null or jsonb_typeof(p_media_manifest)<>'array' or jsonb_array_length(p_media_manifest)>100 then raise exception 'CATALOG_COPY_MEDIA_PAYLOAD_INVALID';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select * into v_batch from public.catalog_onboarding_batches where id=p_batch_id and instance_id=p_instance_id for update;
  if not found or v_batch.source_type<>'copy' then raise exception 'CATALOG_COPY_BATCH_INVALID';end if;if v_batch.created_by<>p_actor then raise exception 'CATALOG_COPY_ACTOR_MISMATCH';end if;
  if v_batch.state='applied' then return v_batch.result;end if;
  v_source_id:=(v_batch.result->>'sourceProductId')::uuid;v_target_id:=(v_batch.result->>'targetProductId')::uuid;
  if coalesce((v_batch.result->>'includeMedia')::boolean,false)<>true then raise exception 'CATALOG_COPY_MEDIA_NOT_REQUESTED';end if;
  if not exists(select 1 from public.products where id=v_target_id and instance_id=p_instance_id and active=false) then raise exception 'CATALOG_COPY_TARGET_INVALID';end if;
  select count(*) into v_expected from public.product_media where instance_id=p_instance_id and product_id=v_source_id;
  if v_expected<>jsonb_array_length(p_media_manifest) then raise exception 'CATALOG_COPY_MEDIA_MANIFEST_INCOMPLETE';end if;
  if exists(select 1 from(select value->>'sourceMediaId' id,count(*) n from jsonb_array_elements(p_media_manifest) group by value->>'sourceMediaId' having count(*)>1)d) then raise exception 'CATALOG_COPY_MEDIA_DUPLICATE';end if;
  for v_row in select value from jsonb_array_elements(p_media_manifest) loop
    begin v_source_media_id:=(v_row->>'sourceMediaId')::uuid;exception when others then raise exception 'CATALOG_COPY_MEDIA_ID_INVALID';end;
    select * into v_source_media from public.product_media where id=v_source_media_id and instance_id=p_instance_id and product_id=v_source_id;if not found then raise exception 'CATALOG_COPY_MEDIA_FOREIGN';end if;
    v_path:=nullif(trim(v_row->>'storagePath'),'');if v_path is null or position(p_instance_id::text||'/'||v_target_id::text||'/' in v_path)<>1 then raise exception 'CATALOG_COPY_MEDIA_PATH_INVALID';end if;
    v_upload_key:='copy-'||replace(p_batch_id::text,'-','')||'-'||left(replace(v_source_media_id::text,'-',''),24);
    insert into public.product_media(instance_id,product_id,upload_key,storage_bucket,storage_path,original_name,content_type,byte_size,alt_text,sort_order)
    values(p_instance_id,v_target_id,v_upload_key,'product-media',v_path,v_source_media.original_name,v_source_media.content_type,v_source_media.byte_size,v_source_media.alt_text,v_source_media.sort_order)
    returning id into v_target_media_id;
    v_media_map:=v_media_map||jsonb_build_object(v_source_media_id::text,v_target_media_id::text);
  end loop;
  for v_map in select value from jsonb_array_elements(coalesce(v_batch.result->'variantMap','[]'::jsonb)) loop
    v_target_variant:=(v_map->>'targetVariantId')::uuid;v_source_primary:=nullif(v_map->>'sourcePrimaryMediaId','');
    if v_source_primary is not null then
      if not(v_media_map?v_source_primary) then raise exception 'CATALOG_COPY_VARIANT_MEDIA_MISSING';end if;
      update public.product_variants set primary_media_id=(v_media_map->>v_source_primary)::uuid,updated_at=clock_timestamp() where id=v_target_variant and instance_id=p_instance_id and product_id=v_target_id;
    end if;
  end loop;
  v_result:=v_batch.result||jsonb_build_object('applied',true,'mediaCount',v_expected,'mediaMap',v_media_map);
  update public.catalog_onboarding_batches set state='applied',result=v_result,applied_at=now() where id=v_batch.id;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_copied','product',v_target_id::text,v_org,p_instance_id,'Termékmásolat médiával piszkozatként létrejött',v_result,jsonb_build_object('audit_source','database_rpc','source_product_id',v_source_id,'media_count',v_expected));
  return v_result;
end;$$;
revoke all on function public.finalize_catalog_product_copy_media_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_catalog_product_copy_media_v1(uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.rollback_catalog_product_copy_v1(p_instance_id uuid,p_batch_id uuid,p_actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_batch public.catalog_onboarding_batches%rowtype;v_target_id uuid;v_source_id uuid;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select * into v_batch from public.catalog_onboarding_batches where id=p_batch_id and instance_id=p_instance_id for update;
  if not found or v_batch.source_type<>'copy' or v_batch.created_by<>p_actor then raise exception 'CATALOG_COPY_BATCH_INVALID';end if;
  if v_batch.state='applied' then raise exception 'CATALOG_COPY_ALREADY_APPLIED';end if;
  v_target_id:=(v_batch.result->>'targetProductId')::uuid;v_source_id:=(v_batch.result->>'sourceProductId')::uuid;
  if exists(select 1 from public.products where id=v_target_id and instance_id=p_instance_id and active=true) then raise exception 'CATALOG_COPY_TARGET_PUBLISHED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  delete from public.products where id=v_target_id and instance_id=p_instance_id and active=false;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_copy_rolled_back','catalog_onboarding_batch',p_batch_id::text,v_org,p_instance_id,'Félbemaradt termékmásolás visszavonva',jsonb_build_object('targetProductId',v_target_id,'rolledBack',true),jsonb_build_object('audit_source','database_rpc','source_product_id',v_source_id));
  delete from public.catalog_onboarding_batches where id=p_batch_id and instance_id=p_instance_id;
  return jsonb_build_object('targetProductId',v_target_id,'rolledBack',true);
end;$$;
revoke all on function public.rollback_catalog_product_copy_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.rollback_catalog_product_copy_v1(uuid,uuid,uuid) to service_role;

comment on function public.apply_catalog_onboarding_batch_v1(uuid,uuid,uuid) is 'Applies the server-persisted CSV or XLSX Product Intake plan atomically.';
comment on function public.prepare_catalog_product_copy_v1(uuid,uuid,uuid,text,text,jsonb) is 'Creates an idempotent inactive same-tenant product copy and prepares deterministic media finalization when requested.';
comment on function public.finalize_catalog_product_copy_media_v1(uuid,uuid,uuid,jsonb) is 'Finalizes a prepared product copy only after application-side storage objects were copied, then remaps variant primary media atomically.';
comment on function public.rollback_catalog_product_copy_v1(uuid,uuid,uuid) is 'Rolls back a prepared, still-unpublished product copy when media storage finalization fails.';
