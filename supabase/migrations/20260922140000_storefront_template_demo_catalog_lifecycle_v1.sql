-- Shared Template Demo Catalog Lifecycle v1
-- Explicit merchant opt-in, machine-identifiable fixture products and atomic launch cleanup.

alter table public.products
  add column if not exists template_demo_namespace text,
  add column if not exists template_demo_key text,
  add column if not exists template_demo_state text,
  add column if not exists template_demo_image_url text,
  add column if not exists template_demo_installed_at timestamptz;

do $$ begin
  alter table public.products add constraint products_template_demo_state_check
    check(template_demo_state is null or template_demo_state in('fixture','adopted','retired'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_template_demo_identity_check
    check(
      (template_demo_namespace is null and template_demo_key is null and template_demo_state is null)
      or
      (
        nullif(trim(template_demo_namespace),'') is not null
        and nullif(trim(template_demo_key),'') is not null
        and template_demo_state in('fixture','adopted','retired')
        and char_length(template_demo_namespace)<=120
        and char_length(template_demo_key)<=120
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_template_demo_image_url_check
    check(template_demo_image_url is null or (char_length(template_demo_image_url)<=500 and template_demo_image_url like '/%'));
exception when duplicate_object then null; end $$;

create unique index if not exists products_instance_template_demo_uidx
  on public.products(instance_id,template_demo_namespace,template_demo_key)
  where template_demo_namespace is not null and template_demo_key is not null;

create index if not exists products_instance_template_demo_state_idx
  on public.products(instance_id,template_demo_state)
  where template_demo_state is not null;

create or replace function public.save_storefront_template_demo_products_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_template_key text,
  p_template_version integer,
  p_namespace text,
  p_enabled boolean,
  p_install jsonb,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_row jsonb;
  v_payload jsonb;
  v_key text;
  v_name text;
  v_slug_base text;
  v_slug text;
  v_image text;
  v_price integer;
  v_stock integer;
  v_product_id uuid;
  v_existing public.products%rowtype;
  v_sku text;
  v_installed integer:=0;
  v_refreshed integer:=0;
  v_preserved integer:=0;
  v_removed integer:=0;
begin
  if p_instance_id is null or p_actor is null then raise exception 'STOREFRONT_DEMO_CATALOG_IDENTITY_REQUIRED';end if;
  if nullif(trim(p_template_key),'') is null or p_template_version<1 or nullif(trim(p_namespace),'') is null then raise exception 'STOREFRONT_DEMO_CATALOG_TEMPLATE_REQUIRED';end if;
  if char_length(p_namespace)>120 then raise exception 'STOREFRONT_DEMO_CATALOG_NAMESPACE_INVALID';end if;
  if p_operation_key is null or p_operation_key!~'^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$' then raise exception 'STOREFRONT_DEMO_CATALOG_OPERATION_KEY_INVALID';end if;
  if not public.is_platform_operator(p_actor) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor) then raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id and status in('pilot','active') for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;

  if coalesce(p_enabled,false) then
    delete from public.products
    where instance_id=p_instance_id and template_demo_state='fixture' and template_demo_namespace<>p_namespace;
    get diagnostics v_removed=row_count;
  else
    delete from public.products where instance_id=p_instance_id and template_demo_state='fixture';
    get diagnostics v_removed=row_count;
  end if;

  if coalesce(p_enabled,false) then
    if p_install is null or jsonb_typeof(p_install)<>'array' then raise exception 'STOREFRONT_DEMO_CATALOG_PRODUCTS_INVALID';end if;
    if jsonb_array_length(p_install)>50 then raise exception 'STOREFRONT_DEMO_CATALOG_PRODUCT_LIMIT_EXCEEDED';end if;

    for v_row in select value from jsonb_array_elements(p_install) loop
      if coalesce(v_row->>'entityType','')<>'product' then continue;end if;
      v_payload:=coalesce(v_row->'payload','{}'::jsonb);
      if coalesce((v_payload->>'installAsDemoProduct')::boolean,false) is not true then continue;end if;
      v_key:=nullif(trim(v_row->>'entityKey'),'');
      v_name:=nullif(trim(v_payload->>'name'),'');
      if v_key is null or char_length(v_key)>120 or v_name is null or char_length(v_name)>200 then raise exception 'STOREFRONT_DEMO_CATALOG_PRODUCT_IDENTITY_INVALID';end if;

      select * into v_existing from public.products
      where instance_id=p_instance_id and template_demo_namespace=p_namespace and template_demo_key=v_key
      for update;

      if found and v_existing.template_demo_state='adopted' then
        v_preserved:=v_preserved+1;
        continue;
      end if;

      v_slug_base:=lower(regexp_replace(coalesce(nullif(trim(v_payload->>'slug'),''),v_key),'[^a-zA-Z0-9]+','-','g'));
      v_slug_base:=trim(both '-' from v_slug_base);
      if v_slug_base='' then v_slug_base:='termek';end if;
      v_slug:='demo-'||left(replace(p_instance_id::text,'-',''),6)||'-'||left(v_slug_base,72)||'-'||left(md5(p_namespace||':'||v_key),8);
      v_sku:='DEMO-'||upper(left(replace(p_instance_id::text,'-',''),6))||'-'||upper(left(md5(p_namespace||':'||v_key),12));
      begin v_price:=greatest(100,(v_payload->>'grossPriceHuf')::integer);exception when others then v_price:=19990;end;
      begin v_stock:=greatest(1,least(999,(v_payload->>'stockQuantity')::integer));exception when others then v_stock:=12;end;
      v_image:=nullif(trim(v_payload->>'image'),'');
      if v_image is not null and (char_length(v_image)>500 or v_image not like '/%') then raise exception 'STOREFRONT_DEMO_CATALOG_IMAGE_INVALID';end if;

      if found then
        update public.products set
          slug=v_slug,
          name=v_name,
          short_description=coalesce(nullif(trim(v_payload->>'shortDescription'),''),'Bemutató termék a sablon kipróbálásához.'),
          description=coalesce(nullif(trim(v_payload->>'description'),''),'Ez egy automatikusan létrehozott bemutató termék. A webshop megnyitásakor törlésre kerül.'),
          active=true,
          audience='retail',
          featured=coalesce((v_payload->>'featured')::boolean,false),
          template_demo_state='fixture',
          template_demo_image_url=v_image,
          updated_at=clock_timestamp()
        where id=v_existing.id and instance_id=p_instance_id
        returning id into v_product_id;
        v_refreshed:=v_refreshed+1;
      else
        insert into public.products(
          instance_id,slug,name,short_description,description,active,audience,featured,
          template_demo_namespace,template_demo_key,template_demo_state,template_demo_image_url,template_demo_installed_at
        ) values(
          p_instance_id,v_slug,v_name,
          coalesce(nullif(trim(v_payload->>'shortDescription'),''),'Bemutató termék a sablon kipróbálásához.'),
          coalesce(nullif(trim(v_payload->>'description'),''),'Ez egy automatikusan létrehozott bemutató termék. A webshop megnyitásakor törlésre kerül.'),
          true,'retail',coalesce((v_payload->>'featured')::boolean,false),
          p_namespace,v_key,'fixture',v_image,clock_timestamp()
        ) returning id into v_product_id;
        v_installed:=v_installed+1;
      end if;

      insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active)
      values(p_instance_id,v_product_id,v_sku,'Alapértelmezett',round(v_price::numeric/1.27)::integer,v_price,v_stock,true)
      on conflict(instance_id,sku) do update set
        product_id=excluded.product_id,label=excluded.label,net_price_huf=excluded.net_price_huf,
        gross_price_huf=excluded.gross_price_huf,stock_quantity=excluded.stock_quantity,active=true;

      insert into public.product_channel_settings(instance_id,product_id,channel_code,visible,gross_price,minimum_quantity,settings)
      values(p_instance_id,v_product_id,'b2c',true,null,1,jsonb_build_object('templateDemo',true))
      on conflict(instance_id,product_id,channel_code) do update set visible=true,updated_at=clock_timestamp();

      if nullif(trim(v_payload->>'demoCategory'),'') is not null then
        insert into public.product_attributes(instance_id,product_id,name,value)
        values(p_instance_id,v_product_id,'Demo kategória',left(trim(v_payload->>'demoCategory'),500))
        on conflict(product_id,name) do update set value=excluded.value,updated_at=clock_timestamp();
      end if;
    end loop;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,
    case when coalesce(p_enabled,false) then 'storefront.demo_catalog_opted_in' else 'storefront.demo_catalog_opted_out' end,
    'storefront_template',p_template_key,v_org,p_instance_id,
    left(case when coalesce(p_enabled,false)
      then 'Demókatalógus bekapcsolva: '||(v_installed+v_refreshed+v_preserved)::text||' termék'
      else 'Demókatalógus kikapcsolva; eltávolított fixture termékek: '||v_removed::text end,500),
    jsonb_build_object('enabled',coalesce(p_enabled,false),'namespace',p_namespace,'installed',v_installed,'refreshed',v_refreshed,'preserved',v_preserved,'removed',v_removed),
    jsonb_build_object('audit_source','database_rpc','rpc','save_storefront_template_demo_products_v1','operation_key',p_operation_key,'template_version',p_template_version)
  );

  return jsonb_build_object(
    'enabled',coalesce(p_enabled,false),'namespace',p_namespace,
    'installed',v_installed,'refreshed',v_refreshed,'preserved',v_preserved,'removed',v_removed,
    'mutationScope','template_demo_products_only'
  );
end;
$$;

revoke all on function public.save_storefront_template_demo_products_v1(uuid,uuid,text,integer,text,boolean,jsonb,text)
from public,anon,authenticated;
grant execute on function public.save_storefront_template_demo_products_v1(uuid,uuid,text,integer,text,boolean,jsonb,text)
to service_role;

create or replace function public.admin_activate_webshop_v2(
  p_instance_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before public.webshop_instances%rowtype;
  v_after public.webshop_instances%rowtype;
  v_demo_removed integer:=0;
  v_demo_namespaces jsonb:='[]'::jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'WEBSHOP_ACTIVATION_IDENTITY_REQUIRED'; end if;
  if not public.is_platform_operator(p_actor) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor) then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;
  select * into v_before from public.webshop_instances where id=p_instance_id for update;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  if v_before.status='active' then return jsonb_build_object('id',p_instance_id,'status','active','replayed',true,'demoProductsRemoved',0); end if;
  if v_before.status<>'pilot' then raise exception 'WEBSHOP_ACTIVATION_STATE_INVALID'; end if;

  if not exists(
    select 1 from public.products p
    where p.instance_id=p_instance_id and p.active=true and coalesce(p.template_demo_state,'')<>'fixture'
      and exists(select 1 from public.product_variants v where v.instance_id=p_instance_id and v.product_id=p.id and v.active=true)
  ) then raise exception 'WEBSHOP_REAL_PRODUCT_REQUIRED'; end if;

  select coalesce(jsonb_agg(distinct template_demo_namespace) filter(where template_demo_namespace is not null),'[]'::jsonb)
  into v_demo_namespaces
  from public.products
  where instance_id=p_instance_id and template_demo_state='fixture';

  delete from public.products where instance_id=p_instance_id and template_demo_state='fixture';
  get diagnostics v_demo_removed=row_count;

  if v_demo_removed>0 then
    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'storefront.demo_catalog_removed_on_activation','webshop_instance',p_instance_id::text,v_before.organization_id,p_instance_id,
      left('Webshop megnyitása előtt automatikusan eltávolított demótermékek: '||v_demo_removed::text,500),
      jsonb_build_object('fixtureProducts',v_demo_removed,'namespaces',v_demo_namespaces),
      jsonb_build_object('fixtureProducts',0),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_activate_webshop_v2')
    );
  end if;

  update public.webshop_instances set status='active',updated_at=now()
  where id=p_instance_id and status='pilot'
  returning * into v_after;
  if not found then raise exception 'WEBSHOP_ACTIVATION_WRITE_MISSING'; end if;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'store.activated','webshop_instance',p_instance_id::text,v_before.organization_id,p_instance_id,
    left(v_before.name||' webshop aktiválva',500),
    jsonb_build_object('status',v_before.status,'demoProducts',v_demo_removed),
    jsonb_build_object('status',v_after.status,'demoProducts',0),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_activate_webshop_v2','demo_products_removed',v_demo_removed,'demo_namespaces',v_demo_namespaces)
  );

  return jsonb_build_object('id',p_instance_id,'status',v_after.status,'replayed',false,'demoProductsRemoved',v_demo_removed);
end;
$$;

revoke all on function public.admin_activate_webshop_v2(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.admin_activate_webshop_v2(uuid,uuid)
to service_role;

comment on function public.save_storefront_template_demo_products_v1(uuid,uuid,text,integer,text,boolean,jsonb,text)
is 'Installs or removes explicitly opted-in template demo products using machine-owned markers; merchant/adopted products are never inferred or removed.';
comment on function public.admin_activate_webshop_v2(uuid,uuid)
is 'Activates a pilot webshop and atomically removes only remaining template demo fixture products, with append-only audit evidence.';
