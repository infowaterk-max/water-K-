-- Digital Commerce Phase 1 checkout/fulfillment closure.
-- v7 preserves v6/v5 price, stock, channel, coupon, idempotency and grouping authorities while
-- making physical/digital fulfillment an explicit server-derived order contract.

create or replace function private.sync_order_digital_entitlements_v1(p_order_id uuid) returns void
language plpgsql security definer set search_path=''
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id;
  if not found then return; end if;

  if v_order.status::text in('cancelled','refunded') then
    update public.digital_entitlements
    set status='revoked',revoked_at=coalesce(revoked_at,now()),revoked_reason=v_order.status::text
    where order_id=p_order_id and instance_id=v_order.instance_id and status<>'revoked';
    update public.digital_guest_access_tokens
    set revoked_at=coalesce(revoked_at,now())
    where order_id=p_order_id and instance_id=v_order.instance_id and revoked_at is null;
    return;
  end if;

  -- A progressing order is not sufficient evidence of payment. This prevents COD or manually
  -- processed orders from unlocking a digital asset before canonical payment evidence exists.
  if v_order.paid_at is null or v_order.status::text not in('paid','processing','shipped','completed') then return; end if;

  insert into public.digital_entitlements(instance_id,order_id,order_item_id,asset_id,customer_id,customer_email,status,max_downloads)
  select oi.instance_id,oi.order_id,oi.id,a.id,v_order.customer_id,v_order.customer_email,'active',a.max_downloads
  from public.order_items oi
  join public.product_variants v on v.id=oi.variant_id and v.instance_id=oi.instance_id
  join public.digital_assets a on a.instance_id=oi.instance_id and a.product_id=v.product_id and a.active=true and(a.variant_id is null or a.variant_id=v.id)
  where oi.order_id=p_order_id and oi.instance_id=v_order.instance_id and oi.fulfillment_type='digital'
  on conflict(instance_id,order_item_id,asset_id) do update set
    status=case when public.digital_entitlements.revoked_reason in('cancelled','refunded') then public.digital_entitlements.status else 'active' end,
    customer_id=excluded.customer_id,
    customer_email=excluded.customer_email,
    revoked_at=case when public.digital_entitlements.revoked_reason in('cancelled','refunded') then public.digital_entitlements.revoked_at else null end,
    revoked_reason=case when public.digital_entitlements.revoked_reason in('cancelled','refunded') then public.digital_entitlements.revoked_reason else null end;
end;
$$;

create or replace function private.order_status_sync_digital_entitlements_v1() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status or new.paid_at is distinct from old.paid_at then
    perform private.sync_order_digital_entitlements_v1(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists orders_sync_digital_entitlements on public.orders;
create trigger orders_sync_digital_entitlements
after insert or update of status,paid_at on public.orders
for each row execute function private.order_status_sync_digital_entitlements_v1();

create or replace function public.place_order_provider_v7_fulfillment_idempotent(
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
  p_shipping_provider text default '',
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
language plpgsql security definer set search_path=''
as $$
declare
  v_fulfillment jsonb;
  v_mode text;
  v_requires_shipping boolean;
  v_digital_lines integer;
  v_physical_lines integer;
  v_result jsonb;
  v_order_id uuid;
  v_payment_flow text;
begin
  v_fulfillment:=public.classify_checkout_fulfillment_v1(p_instance_id,p_items);
  v_mode:=coalesce(v_fulfillment->>'mode','');
  v_requires_shipping:=coalesce((v_fulfillment->>'requiresShipping')::boolean,false);
  v_digital_lines:=coalesce((v_fulfillment->>'digitalLines')::integer,0);
  v_physical_lines:=coalesce((v_fulfillment->>'physicalLines')::integer,0);
  if v_mode not in('physical','digital','mixed') or v_physical_lines+v_digital_lines<1 then raise exception 'DIGITAL_COMMERCE_CLASSIFICATION_INVALID'; end if;

  select payment_flow into v_payment_flow
  from public.commerce_provider_catalog
  where code=p_payment_provider and provider_type='payment' and is_available=true;
  if v_payment_flow is null then raise exception 'DIGITAL_COMMERCE_PAYMENT_PROVIDER_INVALID'; end if;
  if v_digital_lines>0 and v_payment_flow='cash_on_delivery' then
    raise exception 'DIGITAL_COMMERCE_COD_NOT_SUPPORTED';
  end if;

  if v_requires_shipping then
    if nullif(trim(coalesce(p_shipping_provider,'')),'') is null then raise exception 'DIGITAL_COMMERCE_SHIPPING_REQUIRED'; end if;
    v_result:=public.place_order_provider_v6_idempotent(
      p_instance_id,p_idempotency_key,p_customer_email,p_billing_name,p_billing_company,p_billing_tax_number,
      p_billing_postcode,p_billing_city,p_billing_address,p_shipping_name,p_shipping_postcode,p_shipping_city,
      p_shipping_address,p_customer_phone,p_shipping_provider,p_shipping_kind,p_shipping_fee_huf,
      p_free_shipping_threshold_huf,p_parcel_point_id,p_payment_provider,p_note,p_customer_id,p_coupon_code,p_items,p_commerce_groups
    );
  else
    -- v5/v6 accept only physical shipping kinds. Keep that implementation detail inside the wrapper;
    -- externally and on the order itself this is explicit digital delivery with no physical address or fee.
    v_result:=public.place_order_provider_v6_idempotent(
      p_instance_id,p_idempotency_key,p_customer_email,p_billing_name,p_billing_company,p_billing_tax_number,
      p_billing_postcode,p_billing_city,p_billing_address,'','','','',p_customer_phone,
      'digital_delivery','pickup',0,0,'',p_payment_provider,p_note,p_customer_id,p_coupon_code,p_items,p_commerce_groups
    );
  end if;

  v_order_id:=(v_result->>'order_id')::uuid;
  update public.orders
  set fulfillment_mode=v_mode,
      shipping_method=case when v_requires_shipping then shipping_method else 'digital_delivery' end,
      shipping_name=case when v_requires_shipping then shipping_name else null end,
      shipping_postcode=case when v_requires_shipping then shipping_postcode else null end,
      shipping_city=case when v_requires_shipping then shipping_city else null end,
      shipping_address=case when v_requires_shipping then shipping_address else null end,
      parcel_point_id=case when v_requires_shipping then parcel_point_id else null end,
      shipping_gross_huf=case when v_requires_shipping then shipping_gross_huf else 0 end,
      total_gross_huf=case when v_requires_shipping then total_gross_huf else greatest(0,subtotal_gross_huf-coalesce(discount_gross_huf,0)) end,
      updated_at=now()
  where id=v_order_id and instance_id=p_instance_id;
  if not found then raise exception 'DIGITAL_COMMERCE_ORDER_SCOPE_MISMATCH'; end if;

  if not v_requires_shipping then
    update public.order_events
    set metadata=coalesce(metadata,'{}'::jsonb)||pg_catalog.jsonb_build_object(
      'shipping_provider','digital_delivery','shipping_kind','digital_delivery','fulfillment_mode','digital','requires_shipping',false
    )
    where instance_id=p_instance_id and order_id=v_order_id and event_type='order_created';
  end if;

  return v_result||pg_catalog.jsonb_build_object(
    'fulfillment_mode',v_mode,
    'requires_shipping',v_requires_shipping,
    'physical_lines',v_physical_lines,
    'digital_lines',v_digital_lines,
    'shipping_gross_huf',case when v_requires_shipping then coalesce((v_result->>'shipping_gross_huf')::integer,0) else 0 end,
    'total_gross_huf',case when v_requires_shipping then coalesce((v_result->>'total_gross_huf')::integer,0) else greatest(0,coalesce((v_result->>'subtotal_gross_huf')::integer,0)-coalesce((v_result->>'discount_gross_huf')::integer,0)) end
  );
end;
$$;

revoke all on function public.place_order_provider_v7_fulfillment_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.place_order_provider_v7_fulfillment_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb,jsonb) to service_role;
