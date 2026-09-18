-- Digital Commerce Foundation (Phase 1)
-- Shared, tenant-scoped authority for physical/digital fulfillment and purchase-protected downloads.
-- No public digital asset URL is stored or exposed; delivery is authorized server-side per request.

alter table public.products
  add column if not exists fulfillment_type text not null default 'physical';
alter table public.products drop constraint if exists products_fulfillment_type_check;
alter table public.products
  add constraint products_fulfillment_type_check check(fulfillment_type in('physical','digital'));

alter table public.product_variants
  add column if not exists fulfillment_type text;
alter table public.product_variants drop constraint if exists product_variants_fulfillment_type_check;
alter table public.product_variants
  add constraint product_variants_fulfillment_type_check check(fulfillment_type is null or fulfillment_type in('physical','digital'));

alter table public.order_items
  add column if not exists fulfillment_type text not null default 'physical';
alter table public.order_items drop constraint if exists order_items_fulfillment_type_check;
alter table public.order_items
  add constraint order_items_fulfillment_type_check check(fulfillment_type in('physical','digital'));

alter table public.orders
  add column if not exists fulfillment_mode text not null default 'physical';
alter table public.orders drop constraint if exists orders_fulfillment_mode_check;
alter table public.orders
  add constraint orders_fulfillment_mode_check check(fulfillment_mode in('physical','digital','mixed'));

create table if not exists public.digital_assets(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  storage_bucket text not null default 'digital-products-private' check(storage_bucket='digital-products-private'),
  storage_path text not null check(char_length(storage_path) between 3 and 1000 and storage_path !~ '(^|/)\.\.(/|$)'),
  original_name text not null check(char_length(trim(original_name)) between 1 and 255),
  media_type text not null check(char_length(trim(media_type)) between 3 and 160),
  size_bytes bigint not null check(size_bytes between 1 and 2147483648),
  checksum_sha256 text check(checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  max_downloads integer not null default 25 check(max_downloads between 1 and 500),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,storage_path)
);
create index if not exists digital_assets_product_idx on public.digital_assets(instance_id,product_id,active);
create index if not exists digital_assets_variant_idx on public.digital_assets(instance_id,variant_id,active) where variant_id is not null;

create table if not exists public.digital_entitlements(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  asset_id uuid not null references public.digital_assets(id) on delete restrict,
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  status text not null default 'active' check(status in('active','revoked')),
  max_downloads integer not null check(max_downloads between 1 and 500),
  download_count integer not null default 0 check(download_count>=0),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  last_download_at timestamptz,
  unique(instance_id,order_item_id,asset_id)
);
create index if not exists digital_entitlements_account_idx on public.digital_entitlements(instance_id,customer_id,status,granted_at desc) where customer_id is not null;
create index if not exists digital_entitlements_order_idx on public.digital_entitlements(instance_id,order_id,status);

create table if not exists public.digital_guest_access_tokens(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count integer not null default 0 check(use_count>=0),
  revoked_at timestamptz,
  unique(token_hash),
  unique(instance_id,order_id)
);
create index if not exists digital_guest_access_order_idx on public.digital_guest_access_tokens(instance_id,order_id,expires_at);

create table if not exists public.digital_download_audit(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  entitlement_id uuid references public.digital_entitlements(id) on delete set null,
  asset_id uuid references public.digital_assets(id) on delete set null,
  actor_type text not null check(actor_type in('account','guest','system')),
  outcome text not null check(outcome in('allowed','denied')),
  reason text not null check(char_length(reason) between 1 and 160),
  request_fingerprint text check(request_fingerprint is null or request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists digital_download_audit_instance_created_idx on public.digital_download_audit(instance_id,created_at desc);
create index if not exists digital_download_audit_entitlement_idx on public.digital_download_audit(entitlement_id,created_at desc) where entitlement_id is not null;

alter table public.digital_assets enable row level security;
alter table public.digital_entitlements enable row level security;
alter table public.digital_guest_access_tokens enable row level security;
alter table public.digital_download_audit enable row level security;

revoke all on public.digital_assets from public,anon,authenticated;
revoke all on public.digital_entitlements from public,anon,authenticated;
revoke all on public.digital_guest_access_tokens from public,anon,authenticated;
revoke all on public.digital_download_audit from public,anon,authenticated;
revoke insert,update,delete on public.digital_assets from service_role;
revoke insert,update,delete on public.digital_entitlements from service_role;
revoke insert,update,delete on public.digital_guest_access_tokens from service_role;
revoke insert,update,delete on public.digital_download_audit from service_role;
grant select on public.digital_assets to service_role;
grant select on public.digital_entitlements to service_role;
grant select on public.digital_guest_access_tokens to service_role;
grant select on public.digital_download_audit to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'digital-products-private','digital-products-private',false,2147483648,
  array['application/octet-stream','application/zip','application/x-zip-compressed','application/pdf','audio/mpeg','audio/wav','audio/flac','video/mp4','video/webm']
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.resolve_variant_fulfillment_v1(
  p_instance_id uuid,
  p_variant_id uuid
) returns text
language sql stable security definer set search_path=''
as $$
  select coalesce(v.fulfillment_type,p.fulfillment_type,'physical')
  from public.product_variants v
  join public.products p on p.id=v.product_id and p.instance_id=v.instance_id
  where v.id=p_variant_id and v.instance_id=p_instance_id;
$$;
revoke all on function private.resolve_variant_fulfillment_v1(uuid,uuid) from public,anon,authenticated;

create or replace function public.classify_checkout_fulfillment_v1(
  p_instance_id uuid,
  p_items jsonb
) returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
  v_item jsonb;
  v_variant_id uuid;
  v_kind text;
  v_physical integer:=0;
  v_digital integer:=0;
begin
  if pg_catalog.jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array'
     or pg_catalog.jsonb_array_length(coalesce(p_items,'[]'::jsonb))<1
     or pg_catalog.jsonb_array_length(p_items)>30 then
    raise exception 'DIGITAL_COMMERCE_CART_INVALID';
  end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items) loop
    begin v_variant_id:=(v_item->>'variant_id')::uuid; exception when others then raise exception 'DIGITAL_COMMERCE_CART_INVALID'; end;
    v_kind:=private.resolve_variant_fulfillment_v1(p_instance_id,v_variant_id);
    if v_kind is null then raise exception 'DIGITAL_COMMERCE_VARIANT_NOT_FOUND'; end if;
    if v_kind='digital' then v_digital:=v_digital+1; else v_physical:=v_physical+1; end if;
  end loop;
  return pg_catalog.jsonb_build_object(
    'mode',case when v_physical>0 and v_digital>0 then 'mixed' when v_digital>0 then 'digital' else 'physical' end,
    'physicalLines',v_physical,
    'digitalLines',v_digital,
    'requiresShipping',v_physical>0
  );
end;
$$;
revoke all on function public.classify_checkout_fulfillment_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.classify_checkout_fulfillment_v1(uuid,jsonb) to service_role;

create or replace function private.snapshot_order_item_fulfillment_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_kind text;
begin
  if new.variant_id is null then return new; end if;
  v_kind:=private.resolve_variant_fulfillment_v1(new.instance_id,new.variant_id);
  if v_kind is null then raise exception 'DIGITAL_COMMERCE_VARIANT_TENANT_MISMATCH'; end if;
  new.fulfillment_type:=v_kind;
  return new;
end;
$$;
drop trigger if exists order_items_snapshot_fulfillment on public.order_items;
create trigger order_items_snapshot_fulfillment
before insert or update of variant_id,instance_id on public.order_items
for each row execute function private.snapshot_order_item_fulfillment_v1();

create or replace function private.refresh_order_fulfillment_v1(p_order_id uuid) returns void
language plpgsql security definer set search_path=''
as $$
declare v_physical integer;v_digital integer;
begin
  select count(*) filter(where fulfillment_type='physical'),count(*) filter(where fulfillment_type='digital')
    into v_physical,v_digital from public.order_items where order_id=p_order_id;
  if coalesce(v_physical,0)+coalesce(v_digital,0)=0 then return; end if;
  update public.orders set fulfillment_mode=case when v_physical>0 and v_digital>0 then 'mixed' when v_digital>0 then 'digital' else 'physical' end,updated_at=now()
  where id=p_order_id;
end;
$$;

create or replace function private.order_item_refresh_fulfillment_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  perform private.refresh_order_fulfillment_v1(coalesce(new.order_id,old.order_id));
  return coalesce(new,old);
end;
$$;
drop trigger if exists order_items_refresh_fulfillment on public.order_items;
create trigger order_items_refresh_fulfillment
after insert or update of fulfillment_type,order_id or delete on public.order_items
for each row execute function private.order_item_refresh_fulfillment_v1();

create or replace function private.validate_digital_asset_scope_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_product_instance uuid;v_variant_product uuid;v_variant_instance uuid;v_product_kind text;v_variant_kind text;
begin
  select instance_id,fulfillment_type into v_product_instance,v_product_kind from public.products where id=new.product_id;
  if v_product_instance is null or v_product_instance<>new.instance_id then raise exception 'DIGITAL_ASSET_PRODUCT_TENANT_MISMATCH'; end if;
  if new.variant_id is not null then
    select product_id,instance_id,coalesce(fulfillment_type,v_product_kind) into v_variant_product,v_variant_instance,v_variant_kind from public.product_variants where id=new.variant_id;
    if v_variant_instance is null or v_variant_instance<>new.instance_id or v_variant_product<>new.product_id then raise exception 'DIGITAL_ASSET_VARIANT_TENANT_MISMATCH'; end if;
    if v_variant_kind<>'digital' then raise exception 'DIGITAL_ASSET_REQUIRES_DIGITAL_VARIANT'; end if;
  elsif v_product_kind<>'digital' then
    raise exception 'DIGITAL_ASSET_REQUIRES_DIGITAL_PRODUCT';
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
drop trigger if exists digital_assets_validate_scope on public.digital_assets;
create trigger digital_assets_validate_scope
before insert or update of instance_id,product_id,variant_id,storage_path,active on public.digital_assets
for each row execute function private.validate_digital_asset_scope_v1();

create or replace function private.sync_order_digital_entitlements_v1(p_order_id uuid) returns void
language plpgsql security definer set search_path=''
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id;
  if not found then return; end if;
  if v_order.status::text in('paid','processing','shipped','completed') then
    insert into public.digital_entitlements(instance_id,order_id,order_item_id,asset_id,customer_id,customer_email,status,max_downloads)
    select oi.instance_id,oi.order_id,oi.id,a.id,v_order.customer_id,v_order.customer_email,'active',a.max_downloads
    from public.order_items oi
    join public.product_variants v on v.id=oi.variant_id and v.instance_id=oi.instance_id
    join public.digital_assets a on a.instance_id=oi.instance_id and a.product_id=v.product_id and a.active=true and(a.variant_id is null or a.variant_id=v.id)
    where oi.order_id=p_order_id and oi.instance_id=v_order.instance_id and oi.fulfillment_type='digital'
    on conflict(instance_id,order_item_id,asset_id) do update set
      status='active',customer_id=excluded.customer_id,customer_email=excluded.customer_email,revoked_at=null,revoked_reason=null;
  elsif v_order.status::text in('cancelled','refunded') then
    update public.digital_entitlements set status='revoked',revoked_at=coalesce(revoked_at,now()),revoked_reason=v_order.status::text
    where order_id=p_order_id and instance_id=v_order.instance_id and status<>'revoked';
    update public.digital_guest_access_tokens set revoked_at=coalesce(revoked_at,now())
    where order_id=p_order_id and instance_id=v_order.instance_id and revoked_at is null;
  end if;
end;
$$;

create or replace function private.order_status_sync_digital_entitlements_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then perform private.sync_order_digital_entitlements_v1(new.id); end if;
  return new;
end;
$$;
drop trigger if exists orders_sync_digital_entitlements on public.orders;
create trigger orders_sync_digital_entitlements
after insert or update of status on public.orders
for each row execute function private.order_status_sync_digital_entitlements_v1();

create or replace function public.create_digital_guest_access_v1(
  p_instance_id uuid,p_order_id uuid,p_token_hash text,p_expires_at timestamptz
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_order public.orders%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'DIGITAL_GUEST_TOKEN_INVALID'; end if;
  select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id;
  if not found or v_order.customer_id is not null or v_order.status::text not in('paid','processing','shipped','completed') then raise exception 'DIGITAL_GUEST_ACCESS_FORBIDDEN'; end if;
  if not exists(select 1 from public.digital_entitlements e where e.instance_id=p_instance_id and e.order_id=p_order_id and e.status='active') then raise exception 'DIGITAL_GUEST_ACCESS_EMPTY'; end if;
  insert into public.digital_guest_access_tokens(instance_id,order_id,token_hash,expires_at)
  values(p_instance_id,p_order_id,p_token_hash,p_expires_at)
  on conflict(instance_id,order_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,revoked_at=null;
  return true;
end;
$$;
revoke all on function public.create_digital_guest_access_v1(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_digital_guest_access_v1(uuid,uuid,text,timestamptz) to service_role;

create or replace function public.authorize_digital_download_v1(
  p_instance_id uuid,p_asset_id uuid,p_order_id uuid,p_customer_id uuid default null,p_guest_token_hash text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_ent public.digital_entitlements%rowtype;v_order public.orders%rowtype;v_asset public.digital_assets%rowtype;v_guest public.digital_guest_access_tokens%rowtype;v_actor text;
begin
  select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id;
  if not found or v_order.status::text not in('paid','processing','shipped','completed') then raise exception 'DIGITAL_DOWNLOAD_ORDER_NOT_ELIGIBLE'; end if;
  if p_customer_id is not null then
    if v_order.customer_id is distinct from p_customer_id then raise exception 'DIGITAL_DOWNLOAD_ACCOUNT_FORBIDDEN'; end if;
    v_actor:='account';
  else
    if p_guest_token_hash is null or p_guest_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'DIGITAL_DOWNLOAD_GUEST_FORBIDDEN'; end if;
    select * into v_guest from public.digital_guest_access_tokens where instance_id=p_instance_id and order_id=p_order_id and token_hash=p_guest_token_hash and revoked_at is null and expires_at>now() for update;
    if not found then raise exception 'DIGITAL_DOWNLOAD_GUEST_FORBIDDEN'; end if;
    update public.digital_guest_access_tokens set last_used_at=now(),use_count=use_count+1 where id=v_guest.id;
    v_actor:='guest';
  end if;
  select * into v_ent from public.digital_entitlements where instance_id=p_instance_id and order_id=p_order_id and asset_id=p_asset_id and status='active' order by granted_at asc limit 1 for update;
  if not found then raise exception 'DIGITAL_DOWNLOAD_ENTITLEMENT_MISSING'; end if;
  if v_ent.download_count>=v_ent.max_downloads then raise exception 'DIGITAL_DOWNLOAD_LIMIT_REACHED'; end if;
  select * into v_asset from public.digital_assets where id=p_asset_id and instance_id=p_instance_id and active=true;
  if not found then raise exception 'DIGITAL_DOWNLOAD_ASSET_UNAVAILABLE'; end if;
  update public.digital_entitlements set download_count=download_count+1,last_download_at=now() where id=v_ent.id;
  insert into public.digital_download_audit(instance_id,order_id,entitlement_id,asset_id,actor_type,outcome,reason)
  values(p_instance_id,p_order_id,v_ent.id,p_asset_id,v_actor,'allowed','SIGNED_URL_ISSUED');
  return pg_catalog.jsonb_build_object(
    'entitlementId',v_ent.id,'assetId',v_asset.id,'bucket',v_asset.storage_bucket,'path',v_asset.storage_path,
    'fileName',v_asset.original_name,'mediaType',v_asset.media_type,'actorType',v_actor,
    'remainingDownloads',greatest(0,v_ent.max_downloads-v_ent.download_count-1)
  );
end;
$$;
revoke all on function public.authorize_digital_download_v1(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.authorize_digital_download_v1(uuid,uuid,uuid,uuid,text) to service_role;

create or replace function public.record_digital_download_denial_v1(
  p_instance_id uuid,p_order_id uuid,p_asset_id uuid,p_actor_type text,p_reason text,p_request_fingerprint text default null
) returns void
language plpgsql security definer set search_path=''
as $$
begin
  if p_actor_type not in('account','guest','system') or char_length(trim(p_reason)) not between 1 and 160 then return; end if;
  insert into public.digital_download_audit(instance_id,order_id,asset_id,actor_type,outcome,reason,request_fingerprint)
  values(p_instance_id,p_order_id,p_asset_id,p_actor_type,'denied',left(trim(p_reason),160),p_request_fingerprint);
end;
$$;
revoke all on function public.record_digital_download_denial_v1(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_digital_download_denial_v1(uuid,uuid,uuid,text,text,text) to service_role;
