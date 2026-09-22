-- Product Intake Center hardening v1
-- Adds product SEO, variant primary media, resumable/concurrency-safe draft editing
-- and per-product B2C/B2B visibility while preserving the existing catalogue authority.

alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.product_variants add column if not exists primary_media_id uuid;

create unique index if not exists product_media_id_product_instance_uidx
  on public.product_media(id,product_id,instance_id);

do $$
begin
  if not exists(select 1 from pg_constraint where conname='products_seo_title_length') then
    alter table public.products add constraint products_seo_title_length check(seo_title is null or char_length(seo_title)<=200);
  end if;
  if not exists(select 1 from pg_constraint where conname='products_seo_description_length') then
    alter table public.products add constraint products_seo_description_length check(seo_description is null or char_length(seo_description)<=500);
  end if;
  if not exists(select 1 from pg_constraint where conname='product_variants_primary_media_product_fk') then
    alter table public.product_variants add constraint product_variants_primary_media_product_fk
      foreign key(primary_media_id,product_id,instance_id)
      references public.product_media(id,product_id,instance_id) on delete restrict;
  end if;
end $$;

create or replace function public.create_catalog_draft_v2(
  p_instance_id uuid,p_actor uuid,p_idempotency_key text,p_payload_hash text,p_product jsonb,p_variants jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_batch public.catalog_onboarding_batches%rowtype;v_product_id uuid;v_variant_id uuid;
  v_variant_ids jsonb:='[]'::jsonb;v_category_id uuid;v_category_name text;v_category_slug text;
  v_attr record;v_row jsonb;v_result jsonb;v_updated_at timestamptz;
begin
  if p_instance_id is null or p_actor is null or nullif(trim(p_idempotency_key),'') is null then raise exception 'CATALOG_ONBOARDING_IDENTITY_REQUIRED';end if;
  if p_payload_hash !~ '^[a-f0-9]{64}$' or p_product is null or jsonb_typeof(p_product)<>'object' or p_variants is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)<1 or jsonb_array_length(p_variants)>100 then raise exception 'CATALOG_VARIANTS_INVALID';end if;
  if nullif(trim(p_product->>'name'),'') is null or nullif(trim(p_product->>'slug'),'') is null then raise exception 'CATALOG_ONBOARDING_PAYLOAD_INVALID';end if;
  if exists(select 1 from(select lower(trim(value->>'sku')) sku,count(*) n from jsonb_array_elements(p_variants) group by lower(trim(value->>'sku')) having count(*)>1)d) then raise exception 'CATALOG_VARIANT_SKU_DUPLICATE';end if;
  for v_row in select value from jsonb_array_elements(p_variants) loop
    if nullif(trim(v_row->>'sku'),'') is null or nullif(trim(v_row->>'label'),'') is null or coalesce(v_row->>'netPrice','') !~ '^[0-9]+$' or coalesce(v_row->>'grossPrice','') !~ '^[0-9]+$' or coalesce(v_row->>'stock','') !~ '^[0-9]+$' then raise exception 'CATALOG_VARIANTS_INVALID';end if;
  end loop;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  insert into public.catalog_onboarding_batches(instance_id,created_by,source_type,idempotency_key,payload_hash,preview_rows,apply_plan)
  values(p_instance_id,p_actor,'manual',p_idempotency_key,p_payload_hash,jsonb_build_array(jsonb_build_object('product',p_product,'variants',p_variants)),jsonb_build_array(jsonb_build_object('product',p_product,'variants',p_variants))) on conflict(instance_id,idempotency_key) do nothing;
  select * into v_batch from public.catalog_onboarding_batches where instance_id=p_instance_id and idempotency_key=p_idempotency_key for update;
  if not found or v_batch.source_type<>'manual' then raise exception 'CATALOG_ONBOARDING_BATCH_INVALID';end if;
  if v_batch.payload_hash<>p_payload_hash then raise exception 'CATALOG_ONBOARDING_IDEMPOTENCY_CONFLICT';end if;
  if v_batch.state='applied' then return v_batch.result;end if;

  insert into public.products(instance_id,slug,name,short_description,description,seo_title,seo_description,active,audience,featured)
  values(p_instance_id,p_product->>'slug',p_product->>'name',nullif(p_product->>'shortDescription',''),nullif(p_product->>'description',''),nullif(p_product->>'seoTitle',''),nullif(p_product->>'seoDescription',''),false,'retail',false)
  returning id,updated_at into v_product_id,v_updated_at;

  for v_row in select value from jsonb_array_elements(p_variants) loop
    insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active)
    values(p_instance_id,v_product_id,trim(v_row->>'sku'),trim(v_row->>'label'),(v_row->>'netPrice')::integer,(v_row->>'grossPrice')::integer,(v_row->>'stock')::integer,coalesce((v_row->>'active')::boolean,true))
    returning id into v_variant_id;
    v_variant_ids:=v_variant_ids||jsonb_build_array(v_variant_id);
  end loop;

  v_category_name:=nullif(trim(p_product->>'category'),'');v_category_slug:=nullif(trim(p_product->>'categorySlug'),'');
  if v_category_name is not null and v_category_slug is not null then
    insert into public.catalog_categories(instance_id,name,slug) values(p_instance_id,v_category_name,v_category_slug)
    on conflict(instance_id,slug) do update set name=excluded.name,updated_at=now() returning id into v_category_id;
    insert into public.product_category_assignments(instance_id,product_id,category_id) values(p_instance_id,v_product_id,v_category_id) on conflict do nothing;
  end if;
  if jsonb_typeof(coalesce(p_product->'attributes','{}'::jsonb))='object' then
    for v_attr in select key,value from jsonb_each_text(coalesce(p_product->'attributes','{}'::jsonb)) loop
      if nullif(trim(v_attr.key),'') is not null and nullif(trim(v_attr.value),'') is not null then
        insert into public.product_attributes(instance_id,product_id,name,value) values(p_instance_id,v_product_id,trim(v_attr.key),trim(v_attr.value))
        on conflict(product_id,name) do update set value=excluded.value,updated_at=now();
      end if;
    end loop;
  end if;

  insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,updated_at)
  values
    (p_instance_id,v_product_id,'b2c',coalesce((p_product->>'b2cVisible')::boolean,true),now()),
    (p_instance_id,v_product_id,'b2b',coalesce((p_product->>'b2bVisible')::boolean,false),now())
  on conflict(instance_id,product_id,channel_code) do update set visible=excluded.visible,updated_at=excluded.updated_at;

  v_result:=jsonb_build_object('productId',v_product_id,'variantIds',v_variant_ids,'variantCount',jsonb_array_length(v_variant_ids),'draft',true,'updatedAt',v_updated_at);
  update public.catalog_onboarding_batches set state='applied',result=v_result,applied_at=now() where id=v_batch.id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_draft_created','product',v_product_id::text,v_org,p_instance_id,(p_product->>'name')||' termék piszkozat létrehozva '||jsonb_array_length(v_variant_ids)||' variánssal',v_result,jsonb_build_object('audit_source','database_rpc','source','manual_v2','batch_id',v_batch.id,'variant_count',jsonb_array_length(v_variant_ids)));
  return v_result;
end;$$;
revoke all on function public.create_catalog_draft_v2(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_catalog_draft_v2(uuid,uuid,text,text,jsonb,jsonb) to service_role;

create or replace function public.update_catalog_draft_v1(
  p_instance_id uuid,p_product_id uuid,p_actor uuid,p_expected_updated_at timestamptz,p_product jsonb,p_variants jsonb,p_channels jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_product public.products%rowtype;v_row jsonb;v_attr record;v_category_id uuid;
  v_category_name text;v_category_slug text;v_variant_id uuid;v_variant_ids jsonb:='[]'::jsonb;
  v_keep_ids uuid[]:=array[]::uuid[];v_media_id uuid;v_updated_at timestamptz;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_actor is null or p_expected_updated_at is null then raise exception 'CATALOG_DRAFT_IDENTITY_REQUIRED';end if;
  if p_product is null or jsonb_typeof(p_product)<>'object' or p_variants is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)<1 or jsonb_array_length(p_variants)>100 or p_channels is null or jsonb_typeof(p_channels)<>'object' then raise exception 'CATALOG_DRAFT_PAYLOAD_INVALID';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select * into v_product from public.products where id=p_product_id and instance_id=p_instance_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND';end if;
  if v_product.active then raise exception 'CATALOG_DRAFT_ALREADY_PUBLISHED';end if;
  if v_product.updated_at<>p_expected_updated_at then raise exception 'CATALOG_DRAFT_STALE';end if;
  if nullif(trim(p_product->>'name'),'') is null or nullif(trim(p_product->>'slug'),'') is null then raise exception 'CATALOG_DRAFT_PAYLOAD_INVALID';end if;
  if exists(select 1 from(select lower(trim(value->>'sku')) sku,count(*) n from jsonb_array_elements(p_variants) group by lower(trim(value->>'sku')) having count(*)>1)d) then raise exception 'CATALOG_VARIANT_SKU_DUPLICATE';end if;
  if exists(select 1 from(select nullif(value->>'id','') id,count(*) n from jsonb_array_elements(p_variants) where nullif(value->>'id','') is not null group by nullif(value->>'id','') having count(*)>1)d) then raise exception 'CATALOG_VARIANT_ID_DUPLICATE';end if;

  for v_row in select value from jsonb_array_elements(p_variants) loop
    if nullif(trim(v_row->>'sku'),'') is null or nullif(trim(v_row->>'label'),'') is null or coalesce(v_row->>'netPrice','') !~ '^[0-9]+$' or coalesce(v_row->>'grossPrice','') !~ '^[0-9]+$' or coalesce(v_row->>'stock','') !~ '^[0-9]+$' then raise exception 'CATALOG_VARIANTS_INVALID';end if;
    if nullif(v_row->>'id','') is not null then
      begin v_variant_id:=(v_row->>'id')::uuid; exception when others then raise exception 'CATALOG_VARIANT_ID_INVALID';end;
      if not exists(select 1 from public.product_variants where id=v_variant_id and product_id=p_product_id and instance_id=p_instance_id) then raise exception 'CATALOG_VARIANT_FOREIGN';end if;
      v_keep_ids:=array_append(v_keep_ids,v_variant_id);
    end if;
    if nullif(v_row->>'mediaId','') is not null then
      begin v_media_id:=(v_row->>'mediaId')::uuid; exception when others then raise exception 'CATALOG_MEDIA_ID_INVALID';end;
      if not exists(select 1 from public.product_media where id=v_media_id and product_id=p_product_id and instance_id=p_instance_id) then raise exception 'CATALOG_MEDIA_FOREIGN';end if;
    end if;
  end loop;

  if exists(
    select 1 from public.order_items oi join public.product_variants pv on pv.id=oi.variant_id
    where pv.product_id=p_product_id and pv.instance_id=p_instance_id and not(pv.id=any(v_keep_ids))
  ) then raise exception 'CATALOG_DRAFT_VARIANT_IN_USE';end if;

  delete from public.product_variants where product_id=p_product_id and instance_id=p_instance_id and not(id=any(v_keep_ids));
  if cardinality(v_keep_ids)>0 then
    update public.product_variants set sku='__draft__'||replace(id::text,'-','') where product_id=p_product_id and instance_id=p_instance_id and id=any(v_keep_ids);
  end if;

  for v_row in select value from jsonb_array_elements(p_variants) loop
    v_media_id:=null;
    if nullif(v_row->>'mediaId','') is not null then v_media_id:=(v_row->>'mediaId')::uuid;end if;
    if nullif(v_row->>'id','') is not null then
      v_variant_id:=(v_row->>'id')::uuid;
      update public.product_variants set
        sku=trim(v_row->>'sku'),label=trim(v_row->>'label'),net_price_huf=(v_row->>'netPrice')::integer,
        gross_price_huf=(v_row->>'grossPrice')::integer,stock_quantity=(v_row->>'stock')::integer,
        active=coalesce((v_row->>'active')::boolean,true),primary_media_id=v_media_id,updated_at=clock_timestamp()
      where id=v_variant_id and product_id=p_product_id and instance_id=p_instance_id;
    else
      insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active,primary_media_id)
      values(p_instance_id,p_product_id,trim(v_row->>'sku'),trim(v_row->>'label'),(v_row->>'netPrice')::integer,(v_row->>'grossPrice')::integer,(v_row->>'stock')::integer,coalesce((v_row->>'active')::boolean,true),v_media_id)
      returning id into v_variant_id;
    end if;
    v_variant_ids:=v_variant_ids||jsonb_build_array(v_variant_id);
  end loop;

  delete from public.product_category_assignments where product_id=p_product_id and instance_id=p_instance_id;
  v_category_name:=nullif(trim(p_product->>'category'),'');v_category_slug:=nullif(trim(p_product->>'categorySlug'),'');
  if v_category_name is not null and v_category_slug is not null then
    insert into public.catalog_categories(instance_id,name,slug) values(p_instance_id,v_category_name,v_category_slug)
    on conflict(instance_id,slug) do update set name=excluded.name,updated_at=now() returning id into v_category_id;
    insert into public.product_category_assignments(instance_id,product_id,category_id) values(p_instance_id,p_product_id,v_category_id) on conflict do nothing;
  end if;

  delete from public.product_attributes where product_id=p_product_id and instance_id=p_instance_id;
  if jsonb_typeof(coalesce(p_product->'attributes','{}'::jsonb))='object' then
    for v_attr in select key,value from jsonb_each_text(coalesce(p_product->'attributes','{}'::jsonb)) loop
      if nullif(trim(v_attr.key),'') is not null and nullif(trim(v_attr.value),'') is not null then
        insert into public.product_attributes(instance_id,product_id,name,value) values(p_instance_id,p_product_id,trim(v_attr.key),trim(v_attr.value));
      end if;
    end loop;
  end if;

  insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,updated_at)
  values
    (p_instance_id,p_product_id,'b2c',coalesce((p_channels->>'b2c')::boolean,true),now()),
    (p_instance_id,p_product_id,'b2b',coalesce((p_channels->>'b2b')::boolean,false),now())
  on conflict(instance_id,product_id,channel_code) do update set visible=excluded.visible,updated_at=excluded.updated_at;

  update public.products set slug=p_product->>'slug',name=p_product->>'name',short_description=nullif(p_product->>'shortDescription',''),description=nullif(p_product->>'description',''),seo_title=nullif(p_product->>'seoTitle',''),seo_description=nullif(p_product->>'seoDescription',''),updated_at=clock_timestamp()
  where id=p_product_id and instance_id=p_instance_id returning updated_at into v_updated_at;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  v_result:=jsonb_build_object('productId',p_product_id,'variantIds',v_variant_ids,'variantCount',jsonb_array_length(v_variant_ids),'draft',true,'updatedAt',v_updated_at);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(p_actor,'catalog.product_draft_updated','product',p_product_id::text,v_org,p_instance_id,(p_product->>'name')||' termékpiszkozat frissítve',to_jsonb(v_product),v_result,jsonb_build_object('audit_source','database_rpc','variant_count',jsonb_array_length(v_variant_ids),'channels',p_channels));
  return v_result;
end;$$;
revoke all on function public.update_catalog_draft_v1(uuid,uuid,uuid,timestamptz,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.update_catalog_draft_v1(uuid,uuid,uuid,timestamptz,jsonb,jsonb,jsonb) to service_role;

create or replace function public.publish_catalog_product_v1(p_instance_id uuid,p_product_id uuid,p_actor uuid,p_variant_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_product public.products%rowtype;v_expected integer;v_found integer;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_actor is null then raise exception 'CATALOG_PUBLISH_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select * into v_product from public.products where id=p_product_id and instance_id=p_instance_id for update;if not found then raise exception 'PRODUCT_NOT_FOUND';end if;
  if v_product.active then raise exception 'CATALOG_PUBLISH_NOT_DRAFT';end if;
  v_expected:=coalesce(cardinality(p_variant_ids),0);if v_expected<1 or v_expected>100 then raise exception 'CATALOG_PUBLISH_VARIANTS_INVALID';end if;
  select count(*) into v_found from public.product_variants where instance_id=p_instance_id and product_id=p_product_id and id=any(p_variant_ids);if v_found<>v_expected then raise exception 'CATALOG_PUBLISH_VARIANTS_INVALID';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  update public.product_variants set active=(id=any(p_variant_ids)),updated_at=clock_timestamp() where instance_id=p_instance_id and product_id=p_product_id;
  update public.products set active=true,updated_at=clock_timestamp() where id=p_product_id and instance_id=p_instance_id;
  v_result:=jsonb_build_object('productId',p_product_id,'published',true,'activeVariantCount',v_expected);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_published','product',p_product_id::text,v_org,p_instance_id,v_product.name||' termék publikálva '||v_expected||' aktív variánssal',v_result,jsonb_build_object('audit_source','database_rpc','variant_ids',to_jsonb(p_variant_ids)));
  return v_result;
end;$$;
revoke all on function public.publish_catalog_product_v1(uuid,uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.publish_catalog_product_v1(uuid,uuid,uuid,uuid[]) to service_role;

comment on function public.create_catalog_draft_v2(uuid,uuid,text,text,jsonb,jsonb) is 'Creates an inactive tenant-scoped product with a complete editable variant matrix, SEO and product-channel defaults.';
comment on function public.update_catalog_draft_v1(uuid,uuid,uuid,timestamptz,jsonb,jsonb,jsonb) is 'Concurrency-safe atomic Product Intake draft editor authority for product fields, variants, media references, attributes, category and per-product channel visibility.';
comment on function public.publish_catalog_product_v1(uuid,uuid,uuid,uuid[]) is 'Explicitly publishes one draft product and only the verified selected variants.';