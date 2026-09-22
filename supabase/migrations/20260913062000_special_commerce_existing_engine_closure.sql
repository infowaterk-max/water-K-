-- Special Commerce Wave 5: existing engine configuration + grouped cart/order closure.
-- E3/E4/E5/E6 remain shared deterministic engines. v6 wraps the canonical v5 checkout
-- and persists grouping metadata only; price, stock, channel, coupon and order creation
-- remain authoritative in place_order_provider_v5_idempotent.

create unique index if not exists orders_id_instance_uidx
  on public.orders(id,instance_id);
create unique index if not exists order_items_id_order_instance_uidx
  on public.order_items(id,order_id,instance_id);

create table if not exists public.storefront_commerce_engine_configs(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  engine_kind text not null check(engine_kind in('guided_finder','multi_product_composer','product_configurator')),
  config_key text not null check(config_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  label text not null check(char_length(trim(label)) between 1 and 200),
  document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=1048576),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,engine_kind,config_key)
);
create index if not exists storefront_commerce_engine_configs_instance_kind_idx
  on public.storefront_commerce_engine_configs(instance_id,engine_kind,active,config_key);
create index if not exists storefront_commerce_engine_configs_created_by_idx
  on public.storefront_commerce_engine_configs(created_by) where created_by is not null;
create index if not exists storefront_commerce_engine_configs_updated_by_idx
  on public.storefront_commerce_engine_configs(updated_by) where updated_by is not null;

alter table public.storefront_commerce_engine_configs enable row level security;
revoke all on public.storefront_commerce_engine_configs from public,anon,authenticated;
revoke insert,update,delete on public.storefront_commerce_engine_configs from service_role;
grant select on public.storefront_commerce_engine_configs to service_role;

create or replace function public.save_storefront_commerce_engine_config_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_engine_kind text,
  p_document jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_config jsonb;
  v_key text;
  v_label text;
  v_id uuid;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'STOREFRONT_ENGINE_CONFIG_FORBIDDEN';
  end if;
  if p_engine_kind not in('guided_finder','multi_product_composer','product_configurator') then
    raise exception 'STOREFRONT_ENGINE_KIND_INVALID';
  end if;
  if p_document is null or pg_catalog.jsonb_typeof(p_document)<>'object' or pg_catalog.octet_length(p_document::text)>1048576 then
    raise exception 'STOREFRONT_ENGINE_DOCUMENT_INVALID';
  end if;
  v_config:=p_document->'config';
  if pg_catalog.jsonb_typeof(v_config)<>'object' or coalesce((v_config->>'version')::integer,0)<>1 then
    raise exception 'STOREFRONT_ENGINE_CONFIG_INVALID';
  end if;
  if coalesce(v_config->>'tenantId','')<>p_instance_id::text then
    raise exception 'STOREFRONT_ENGINE_TENANT_MISMATCH';
  end if;
  v_key:=case p_engine_kind
    when 'guided_finder' then trim(coalesce(v_config->>'finderKey',''))
    when 'multi_product_composer' then trim(coalesce(v_config->>'composerKey',''))
    else trim(coalesce(v_config->>'configuratorKey',''))
  end;
  v_label:=trim(coalesce(v_config->>'label',''));
  if v_key !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' or char_length(v_label) not between 1 and 200 then
    raise exception 'STOREFRONT_ENGINE_IDENTITY_INVALID';
  end if;
  if p_engine_kind='guided_finder' and pg_catalog.jsonb_typeof(coalesce(v_config->'steps','[]'::jsonb))<>'array' then
    raise exception 'STOREFRONT_FINDER_STEPS_INVALID';
  end if;
  if p_engine_kind='multi_product_composer' and (
    coalesce(v_config->>'mode','') not in('pool','slots') or
    pg_catalog.jsonb_typeof(coalesce(v_config->'slots','[]'::jsonb))<>'array'
  ) then
    raise exception 'STOREFRONT_COMPOSER_CONFIG_INVALID';
  end if;
  if p_engine_kind='product_configurator' and (
    pg_catalog.jsonb_typeof(coalesce(v_config->'slots','[]'::jsonb))<>'array' or
    pg_catalog.jsonb_typeof(coalesce(p_document->'compatibilityRules','[]'::jsonb))<>'array'
  ) then
    raise exception 'STOREFRONT_CONFIGURATOR_CONFIG_INVALID';
  end if;

  insert into public.storefront_commerce_engine_configs(
    instance_id,engine_kind,config_key,label,document,active,created_by,updated_by
  ) values(
    p_instance_id,p_engine_kind,v_key,v_label,p_document,true,p_actor,p_actor
  )
  on conflict(instance_id,engine_kind,config_key) do update set
    label=excluded.label,
    document=excluded.document,
    active=true,
    updated_by=excluded.updated_by,
    updated_at=now()
  returning id into v_id;

  return jsonb_build_object('configId',v_id,'engineKind',p_engine_kind,'configKey',v_key);
end;
$$;

create or replace function public.delete_storefront_commerce_engine_config_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_config_id uuid
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'STOREFRONT_ENGINE_CONFIG_FORBIDDEN';
  end if;
  delete from public.storefront_commerce_engine_configs
  where instance_id=p_instance_id and id=p_config_id;
  return found;
end;
$$;

revoke all on function public.save_storefront_commerce_engine_config_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.delete_storefront_commerce_engine_config_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_storefront_commerce_engine_config_v1(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.delete_storefront_commerce_engine_config_v1(uuid,uuid,uuid) to service_role;

create table if not exists public.order_commerce_group_requests(
  instance_id uuid not null,
  order_id uuid not null,
  group_fingerprint text not null check(group_fingerprint ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now(),
  primary key(instance_id,order_id),
  foreign key(order_id,instance_id) references public.orders(id,instance_id) on delete cascade
);

create table if not exists public.order_commerce_groups(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  order_id uuid not null,
  group_type text not null check(group_type in('composition','configuration')),
  group_key text not null check(group_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  engine_version text not null check(char_length(trim(engine_version)) between 1 and 160),
  definition_key text not null check(definition_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  definition_version integer not null check(definition_version between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key(order_id,instance_id) references public.orders(id,instance_id) on delete cascade,
  unique(instance_id,order_id,group_type,group_key),
  unique(id,order_id,instance_id)
);

create table if not exists public.order_commerce_group_items(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  order_id uuid not null,
  group_id uuid not null,
  order_item_id uuid not null,
  item_key text not null check(item_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  slot_id text check(slot_id is null or slot_id ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  quantity integer not null check(quantity between 1 and 99),
  created_at timestamptz not null default now(),
  foreign key(group_id,order_id,instance_id) references public.order_commerce_groups(id,order_id,instance_id) on delete cascade,
  foreign key(order_item_id,order_id,instance_id) references public.order_items(id,order_id,instance_id) on delete cascade,
  unique(instance_id,group_id,item_key)
);

create index if not exists order_commerce_group_requests_order_fk_idx
  on public.order_commerce_group_requests(order_id,instance_id);
create index if not exists order_commerce_groups_order_fk_idx
  on public.order_commerce_groups(order_id,instance_id,created_at);
create index if not exists order_commerce_group_items_group_fk_idx
  on public.order_commerce_group_items(group_id,order_id,instance_id);
create index if not exists order_commerce_group_items_order_item_fk_idx
  on public.order_commerce_group_items(order_item_id,order_id,instance_id);

alter table public.order_commerce_group_requests enable row level security;
alter table public.order_commerce_groups enable row level security;
alter table public.order_commerce_group_items enable row level security;

revoke all on public.order_commerce_group_requests from public,anon,authenticated;
revoke all on public.order_commerce_groups from public,anon,authenticated;
revoke all on public.order_commerce_group_items from public,anon,authenticated;
revoke insert,update,delete on public.order_commerce_group_requests from service_role;
revoke insert,update,delete on public.order_commerce_groups from service_role;
revoke insert,update,delete on public.order_commerce_group_items from service_role;
grant select on public.order_commerce_group_requests to service_role;
grant select on public.order_commerce_groups to service_role,authenticated;
grant select on public.order_commerce_group_items to service_role,authenticated;

create policy order_commerce_groups_customer_or_store_read
on public.order_commerce_groups for select to authenticated
using(
  public.can_read_store(instance_id)
  or exists(
    select 1 from public.orders o
    where o.id=order_id and o.instance_id=instance_id and o.customer_id=(select auth.uid())
  )
);

create policy order_commerce_group_items_customer_or_store_read
on public.order_commerce_group_items for select to authenticated
using(
  public.can_read_store(instance_id)
  or exists(
    select 1 from public.orders o
    where o.id=order_id and o.instance_id=instance_id and o.customer_id=(select auth.uid())
  )
);

create or replace function private.normalize_order_commerce_groups_v1(
  p_items jsonb,
  p_groups jsonb
) returns jsonb
language plpgsql
immutable
set search_path=''
as $$
declare
  v_group jsonb;
  v_item jsonb;
  v_group_items jsonb;
  v_normalized jsonb:='[]'::jsonb;
  v_type text;
  v_group_key text;
  v_engine text;
  v_definition text;
  v_definition_version integer;
  v_item_key text;
  v_slot text;
  v_variant uuid;
  v_quantity integer;
begin
  if pg_catalog.jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then
    raise exception 'COMMERCE_GROUP_CART_ITEMS_INVALID';
  end if;
  if pg_catalog.jsonb_typeof(coalesce(p_groups,'[]'::jsonb))<>'array' or pg_catalog.jsonb_array_length(coalesce(p_groups,'[]'::jsonb))>20 then
    raise exception 'COMMERCE_GROUPS_INVALID';
  end if;
  if exists(
    select 1 from pg_catalog.jsonb_array_elements(coalesce(p_groups,'[]'::jsonb)) g
    group by g.value->>'type',g.value->>'id'
    having count(*)>1
  ) then
    raise exception 'COMMERCE_GROUP_DUPLICATE';
  end if;

  for v_group in select value from pg_catalog.jsonb_array_elements(coalesce(p_groups,'[]'::jsonb)) loop
    if pg_catalog.jsonb_typeof(v_group)<>'object' then raise exception 'COMMERCE_GROUP_INVALID'; end if;
    v_type:=trim(coalesce(v_group->>'type',''));
    v_group_key:=trim(coalesce(v_group->>'id',''));
    v_engine:=trim(coalesce(v_group->>'engineVersion',''));
    v_definition:=trim(coalesce(v_group->>'definitionKey',''));
    begin v_definition_version:=(v_group->>'definitionVersion')::integer; exception when others then raise exception 'COMMERCE_GROUP_DEFINITION_INVALID'; end;
    if v_type not in('composition','configuration') then raise exception 'COMMERCE_GROUP_TYPE_INVALID'; end if;
    if v_group_key !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' or v_definition !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' then raise exception 'COMMERCE_GROUP_IDENTITY_INVALID'; end if;
    if char_length(v_engine) not between 1 and 160 or v_definition_version not between 1 and 1000 then raise exception 'COMMERCE_GROUP_DEFINITION_INVALID'; end if;
    if pg_catalog.jsonb_typeof(coalesce(v_group->'items','[]'::jsonb))<>'array' or pg_catalog.jsonb_array_length(coalesce(v_group->'items','[]'::jsonb)) not between 1 and 100 then raise exception 'COMMERCE_GROUP_ITEMS_INVALID'; end if;
    if exists(
      select 1 from pg_catalog.jsonb_array_elements(v_group->'items') gi
      group by gi.value->>'itemKey'
      having count(*)>1
    ) then raise exception 'COMMERCE_GROUP_ITEM_DUPLICATE'; end if;

    v_group_items:='[]'::jsonb;
    for v_item in select value from pg_catalog.jsonb_array_elements(v_group->'items') loop
      if pg_catalog.jsonb_typeof(v_item)<>'object' then raise exception 'COMMERCE_GROUP_ITEM_INVALID'; end if;
      v_item_key:=trim(coalesce(v_item->>'itemKey',''));
      v_slot:=nullif(trim(coalesce(v_item->>'slotId','')),'');
      begin
        v_variant=(v_item->>'variant_id')::uuid;
        v_quantity=(v_item->>'quantity')::integer;
      exception when others then raise exception 'COMMERCE_GROUP_ITEM_INVALID'; end;
      if v_item_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then raise exception 'COMMERCE_GROUP_ITEM_KEY_INVALID'; end if;
      if v_slot is not null and v_slot !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' then raise exception 'COMMERCE_GROUP_SLOT_INVALID'; end if;
      if v_quantity not between 1 and 99 then raise exception 'COMMERCE_GROUP_QUANTITY_INVALID'; end if;
      v_group_items:=v_group_items||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'itemKey',v_item_key,'variant_id',v_variant,'quantity',v_quantity,'slotId',v_slot
      ));
    end loop;
    select coalesce(pg_catalog.jsonb_agg(value order by value->>'itemKey'),'[]'::jsonb)
      into v_group_items from pg_catalog.jsonb_array_elements(v_group_items);
    v_normalized:=v_normalized||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'type',v_type,
      'id',v_group_key,
      'engineVersion',v_engine,
      'definitionKey',v_definition,
      'definitionVersion',v_definition_version,
      'items',v_group_items
    ));
  end loop;

  select coalesce(pg_catalog.jsonb_agg(value order by value->>'type',value->>'id'),'[]'::jsonb)
    into v_normalized from pg_catalog.jsonb_array_elements(v_normalized);

  if exists(
    with grouped as(
      select (i->>'variant_id')::uuid variant_id,sum((i->>'quantity')::integer)::integer quantity
      from pg_catalog.jsonb_array_elements(v_normalized) g
      cross join lateral pg_catalog.jsonb_array_elements(g->'items') i
      group by (i->>'variant_id')::uuid
    ), cart as(
      select (i->>'variant_id')::uuid variant_id,sum((i->>'quantity')::integer)::integer quantity
      from pg_catalog.jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) i
      group by (i->>'variant_id')::uuid
    )
    select 1 from grouped g left join cart c using(variant_id)
    where c.variant_id is null or g.quantity>c.quantity
  ) then
    raise exception 'COMMERCE_GROUP_ALLOCATION_EXCEEDS_CART';
  end if;

  return v_normalized;
end;
$$;

revoke all on function private.normalize_order_commerce_groups_v1(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.place_order_provider_v6_idempotent(
  p_instance_id uuid,
  p_idempotency_key text,
  p_customer_email text,
  p_billing_name text,
  p_billing_company text default '',
  p_billing_tax_number text default '',
  p_billing_postcode text default '',
  p_billing_city text default '',
  p_billing_address text default '',
  p_shipping_name text default '',
  p_shipping_postcode text default '',
  p_shipping_city text default '',
  p_shipping_address text default '',
  p_customer_phone text default '',
  p_shipping_provider text default 'pickup',
  p_shipping_kind text default 'pickup',
  p_shipping_fee_huf integer default 0,
  p_free_shipping_threshold_huf integer default 0,
  p_parcel_point_id text default '',
  p_payment_provider text default 'bank_transfer',
  p_note text default '',
  p_customer_id uuid default null,
  p_coupon_code text default '',
  p_items jsonb default '[]'::jsonb,
  p_commerce_groups jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_groups jsonb;
  v_group jsonb;
  v_group_item jsonb;
  v_result jsonb;
  v_order_id uuid;
  v_group_id uuid;
  v_order_item_id uuid;
  v_fingerprint text;
  v_existing_fingerprint text;
  v_replayed boolean;
begin
  v_groups:=private.normalize_order_commerce_groups_v1(p_items,p_commerce_groups);
  v_fingerprint:=pg_catalog.md5(v_groups::text);

  v_result:=public.place_order_provider_v5_idempotent(
    p_instance_id,p_idempotency_key,p_customer_email,p_billing_name,p_billing_company,p_billing_tax_number,
    p_billing_postcode,p_billing_city,p_billing_address,p_shipping_name,p_shipping_postcode,p_shipping_city,
    p_shipping_address,p_customer_phone,p_shipping_provider,p_shipping_kind,p_shipping_fee_huf,
    p_free_shipping_threshold_huf,p_parcel_point_id,p_payment_provider,p_note,p_customer_id,p_coupon_code,p_items
  );
  v_order_id:=(v_result->>'order_id')::uuid;
  v_replayed:=coalesce((v_result->>'idempotency_replayed')::boolean,false);

  select group_fingerprint into v_existing_fingerprint
  from public.order_commerce_group_requests
  where instance_id=p_instance_id and order_id=v_order_id;

  if found then
    if v_existing_fingerprint<>v_fingerprint then
      raise exception 'COMMERCE_GROUP_IDEMPOTENCY_MISMATCH';
    end if;
    return v_result||pg_catalog.jsonb_build_object('commerce_groups_preserved',pg_catalog.jsonb_array_length(v_groups)>0);
  end if;

  if v_replayed and pg_catalog.jsonb_array_length(v_groups)>0 then
    raise exception 'COMMERCE_GROUP_REPLAY_METADATA_MISSING';
  end if;

  insert into public.order_commerce_group_requests(instance_id,order_id,group_fingerprint)
  values(p_instance_id,v_order_id,v_fingerprint);

  if not v_replayed then
    for v_group in select value from pg_catalog.jsonb_array_elements(v_groups) loop
      insert into public.order_commerce_groups(
        instance_id,order_id,group_type,group_key,engine_version,definition_key,definition_version
      ) values(
        p_instance_id,v_order_id,v_group->>'type',v_group->>'id',v_group->>'engineVersion',v_group->>'definitionKey',(v_group->>'definitionVersion')::integer
      ) returning id into v_group_id;

      for v_group_item in select value from pg_catalog.jsonb_array_elements(v_group->'items') loop
        select oi.id into v_order_item_id
        from public.order_items oi
        where oi.instance_id=p_instance_id
          and oi.order_id=v_order_id
          and oi.variant_id=(v_group_item->>'variant_id')::uuid
        limit 1;
        if v_order_item_id is null then raise exception 'COMMERCE_GROUP_ORDER_ITEM_MISSING'; end if;
        insert into public.order_commerce_group_items(
          instance_id,order_id,group_id,order_item_id,item_key,slot_id,quantity
        ) values(
          p_instance_id,v_order_id,v_group_id,v_order_item_id,v_group_item->>'itemKey',nullif(v_group_item->>'slotId',''),(v_group_item->>'quantity')::integer
        );
      end loop;
    end loop;
  end if;

  return v_result||pg_catalog.jsonb_build_object('commerce_groups_preserved',pg_catalog.jsonb_array_length(v_groups)>0);
end;
$$;

revoke all on function public.place_order_provider_v6_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.place_order_provider_v6_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb,jsonb) to service_role;
