-- Digital Commerce Phase 1 hardening: safe trigger semantics, catalog authority,
-- asset lifecycle RPCs and bounded signed-link issuance.

create or replace function private.order_item_refresh_fulfillment_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_order_id uuid;
begin
  if tg_op='DELETE' then v_order_id:=old.order_id; else v_order_id:=new.order_id; end if;
  perform private.refresh_order_fulfillment_v1(v_order_id);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

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
    on conflict(instance_id,order_item_id,asset_id) do nothing;
  elsif v_order.status::text in('cancelled','refunded') then
    update public.digital_entitlements set status='revoked',revoked_at=coalesce(revoked_at,now()),revoked_reason=v_order.status::text
    where order_id=p_order_id and instance_id=v_order.instance_id and status<>'revoked';
    update public.digital_guest_access_tokens set revoked_at=coalesce(revoked_at,now())
    where order_id=p_order_id and instance_id=v_order.instance_id and revoked_at is null;
  end if;
end;
$$;

create or replace function public.set_product_fulfillment_v1(
  p_instance_id uuid,p_actor uuid,p_product_id uuid,p_fulfillment_type text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED'; end if;
  if p_fulfillment_type not in('physical','digital') then raise exception 'DIGITAL_FULFILLMENT_INVALID'; end if;
  update public.products set fulfillment_type=p_fulfillment_type,updated_at=now()
  where id=p_product_id and instance_id=p_instance_id;
  if not found then raise exception 'DIGITAL_PRODUCT_NOT_FOUND'; end if;
  if p_fulfillment_type='physical' and exists(
    select 1 from public.digital_assets where instance_id=p_instance_id and product_id=p_product_id and active=true
  ) then raise exception 'DIGITAL_PRODUCT_HAS_ACTIVE_ASSETS'; end if;
  return jsonb_build_object('productId',p_product_id,'fulfillmentType',p_fulfillment_type);
end;
$$;
revoke all on function public.set_product_fulfillment_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_product_fulfillment_v1(uuid,uuid,uuid,text) to service_role;

create or replace function public.create_digital_asset_draft_v1(
  p_instance_id uuid,p_actor uuid,p_asset_id uuid,p_product_id uuid,p_variant_id uuid,
  p_storage_path text,p_original_name text,p_media_type text,p_size_bytes bigint,p_checksum_sha256 text,p_max_downloads integer
) returns jsonb
language plpgsql security definer set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED'; end if;
  insert into public.digital_assets(id,instance_id,product_id,variant_id,storage_path,original_name,media_type,size_bytes,checksum_sha256,max_downloads,active,created_by)
  values(p_asset_id,p_instance_id,p_product_id,p_variant_id,p_storage_path,trim(p_original_name),trim(p_media_type),p_size_bytes,nullif(lower(trim(p_checksum_sha256)),''),p_max_downloads,false,p_actor);
  return jsonb_build_object('assetId',p_asset_id,'storagePath',p_storage_path,'active',false);
end;
$$;

create or replace function public.activate_digital_asset_v1(
  p_instance_id uuid,p_actor uuid,p_asset_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_asset public.digital_assets%rowtype;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED'; end if;
  select * into v_asset from public.digital_assets where id=p_asset_id and instance_id=p_instance_id for update;
  if not found then raise exception 'DIGITAL_ASSET_NOT_FOUND'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id=v_asset.storage_bucket and o.name=v_asset.storage_path) then raise exception 'DIGITAL_ASSET_OBJECT_MISSING'; end if;
  update public.digital_assets set active=true,updated_at=now() where id=p_asset_id and instance_id=p_instance_id;
  if exists(select 1 from public.orders o join public.order_items oi on oi.order_id=o.id and oi.instance_id=o.instance_id where oi.instance_id=p_instance_id and oi.fulfillment_type='digital' and o.status::text in('paid','processing','shipped','completed')) then
    perform private.sync_order_digital_entitlements_v1(o.id) from public.orders o
    where o.instance_id=p_instance_id and o.status::text in('paid','processing','shipped','completed')
      and exists(select 1 from public.order_items oi join public.product_variants v on v.id=oi.variant_id and v.instance_id=oi.instance_id where oi.order_id=o.id and oi.instance_id=p_instance_id and oi.fulfillment_type='digital' and v.product_id=v_asset.product_id and(v_asset.variant_id is null or v.id=v_asset.variant_id));
  end if;
  return jsonb_build_object('assetId',p_asset_id,'active',true);
end;
$$;

create or replace function public.deactivate_digital_asset_v1(
  p_instance_id uuid,p_actor uuid,p_asset_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED'; end if;
  update public.digital_assets set active=false,updated_at=now() where id=p_asset_id and instance_id=p_instance_id;
  if not found then raise exception 'DIGITAL_ASSET_NOT_FOUND'; end if;
  update public.digital_entitlements set status='revoked',revoked_at=coalesce(revoked_at,now()),revoked_reason='asset_deactivated'
  where instance_id=p_instance_id and asset_id=p_asset_id and status='active';
  return jsonb_build_object('assetId',p_asset_id,'active',false);
end;
$$;

revoke all on function public.create_digital_asset_draft_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,bigint,text,integer) from public,anon,authenticated;
revoke all on function public.activate_digital_asset_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.deactivate_digital_asset_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_digital_asset_draft_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,bigint,text,integer) to service_role;
grant execute on function public.activate_digital_asset_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.deactivate_digital_asset_v1(uuid,uuid,uuid) to service_role;

create or replace function public.authorize_digital_download_v2(
  p_instance_id uuid,p_asset_id uuid,p_order_id uuid,p_customer_id uuid default null,p_guest_token_hash text default null,p_request_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_ent public.digital_entitlements%rowtype;v_order public.orders%rowtype;v_asset public.digital_assets%rowtype;v_guest public.digital_guest_access_tokens%rowtype;v_actor text;v_recent integer:=0;
begin
  if p_request_fingerprint is not null and p_request_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'DIGITAL_DOWNLOAD_FINGERPRINT_INVALID'; end if;
  if p_request_fingerprint is not null then
    select count(*) into v_recent from public.digital_download_audit
    where instance_id=p_instance_id and request_fingerprint=p_request_fingerprint and created_at>=now()-interval '1 hour';
    if v_recent>=30 then raise exception 'DIGITAL_DOWNLOAD_RATE_LIMITED'; end if;
  end if;
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
  insert into public.digital_download_audit(instance_id,order_id,entitlement_id,asset_id,actor_type,outcome,reason,request_fingerprint)
  values(p_instance_id,p_order_id,v_ent.id,p_asset_id,v_actor,'allowed','SIGNED_URL_ISSUED',p_request_fingerprint);
  return jsonb_build_object('entitlementId',v_ent.id,'assetId',v_asset.id,'bucket',v_asset.storage_bucket,'path',v_asset.storage_path,'fileName',v_asset.original_name,'mediaType',v_asset.media_type,'actorType',v_actor,'remainingDownloads',greatest(0,v_ent.max_downloads-v_ent.download_count-1));
end;
$$;
revoke all on function public.authorize_digital_download_v1(uuid,uuid,uuid,uuid,text) from service_role;
revoke all on function public.authorize_digital_download_v2(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.authorize_digital_download_v2(uuid,uuid,uuid,uuid,text,text) to service_role;
