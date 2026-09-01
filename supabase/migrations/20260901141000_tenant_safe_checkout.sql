-- Tenant-safe checkout bridge.
-- Validates that every variant belongs to the requested webshop before the legacy order engine runs,
-- namespaces idempotency per store, and stamps the complete order graph with instance_id.

create or replace function public.sync_order_item_instance() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_instance uuid; variant_instance uuid;
begin
  select instance_id into parent_instance from public.orders where id=new.order_id;
  if new.variant_id is not null then select instance_id into variant_instance from public.product_variants where id=new.variant_id; end if;
  if parent_instance is not null and variant_instance is not null and parent_instance<>variant_instance then raise exception 'Cross-store order item is not allowed.'; end if;
  if new.instance_id is not null and coalesce(parent_instance,variant_instance) is not null and new.instance_id<>coalesce(parent_instance,variant_instance) then raise exception 'Order item store scope mismatch.'; end if;
  new.instance_id:=coalesce(parent_instance,variant_instance,new.instance_id);
  return new;
end $$;

create or replace function public.place_order_provider_v3_idempotent(
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
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  response jsonb;
  order_id_value uuid;
  scoped_key text;
  item_count integer;
  valid_item_count integer;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in ('pilot','active')) then
    raise exception 'A webshop nem rendelhető.';
  end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'Érvénytelen kosár.'; end if;
  select count(*) into item_count from jsonb_array_elements(p_items);
  if item_count<1 then raise exception 'A kosár üres.'; end if;
  select count(*) into valid_item_count
  from jsonb_array_elements(p_items) item
  join public.product_variants v on v.id=(item->>'variant_id')::uuid
  join public.products p on p.id=v.product_id
  where v.instance_id=p_instance_id and p.instance_id=p_instance_id and v.active and p.active;
  if valid_item_count<>item_count then raise exception 'A kosár másik webshophoz tartozó vagy nem elérhető terméket tartalmaz.'; end if;

  scoped_key:=md5(p_instance_id::text||':'||trim(coalesce(p_idempotency_key,'')));
  response:=public.place_order_provider_v2_idempotent(
    p_idempotency_key=>scoped_key,
    p_customer_email=>p_customer_email,
    p_billing_name=>p_billing_name,
    p_billing_company=>p_billing_company,
    p_billing_tax_number=>p_billing_tax_number,
    p_billing_postcode=>p_billing_postcode,
    p_billing_city=>p_billing_city,
    p_billing_address=>p_billing_address,
    p_shipping_name=>p_shipping_name,
    p_shipping_postcode=>p_shipping_postcode,
    p_shipping_city=>p_shipping_city,
    p_shipping_address=>p_shipping_address,
    p_customer_phone=>p_customer_phone,
    p_shipping_provider=>p_shipping_provider,
    p_shipping_kind=>p_shipping_kind,
    p_shipping_fee_huf=>p_shipping_fee_huf,
    p_free_shipping_threshold_huf=>p_free_shipping_threshold_huf,
    p_parcel_point_id=>p_parcel_point_id,
    p_payment_provider=>p_payment_provider,
    p_note=>p_note,
    p_customer_id=>p_customer_id,
    p_coupon_code=>p_coupon_code,
    p_items=>p_items
  );
  order_id_value:=(response->>'order_id')::uuid;

  if exists(select 1 from public.orders where id=order_id_value and instance_id is not null and instance_id<>p_instance_id) then
    raise exception 'A rendelés webshop scope-ja nem egyezik.';
  end if;
  update public.orders set instance_id=p_instance_id where id=order_id_value and instance_id is null;
  update public.order_items set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;
  update public.inventory_events set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;
  update public.inventory_reservations set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;

  return response||jsonb_build_object('instance_id',p_instance_id);
end $$;

revoke all on function public.place_order_provider_v3_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) from public;
grant execute on function public.place_order_provider_v3_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) to anon,authenticated,service_role;
