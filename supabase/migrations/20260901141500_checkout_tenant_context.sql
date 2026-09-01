-- Checkout tenant context v4.
-- Ensures orders created by the legacy internal engine receive instance_id BEFORE the row is inserted,
-- so strict NOT NULL tenant isolation remains compatible with the wrapped order engine.

create or replace function public.apply_checkout_instance_context() returns trigger
language plpgsql security definer set search_path=public as $$
declare raw_instance text;ctx uuid;
begin
  if new.instance_id is not null then return new; end if;
  raw_instance:=current_setting('shoperation.instance_id',true);
  if nullif(raw_instance,'') is null then
    raise exception 'Order insert blocked: explicit webshop tenant context is required.';
  end if;
  begin ctx:=raw_instance::uuid; exception when others then raise exception 'Order insert blocked: invalid webshop tenant context.'; end;
  if not exists(select 1 from public.webshop_instances w where w.id=ctx and w.status in('pilot','active')) then
    raise exception 'Order insert blocked: webshop tenant context is not active.';
  end if;
  new.instance_id:=ctx;
  return new;
end $$;

drop trigger if exists orders_apply_checkout_instance_context on public.orders;
create trigger orders_apply_checkout_instance_context
before insert on public.orders
for each row execute function public.apply_checkout_instance_context();

create or replace function public.place_order_provider_v4_idempotent(
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
language plpgsql security definer set search_path=public as $$
declare response jsonb;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then
    raise exception 'A webshop nem rendelhető.';
  end if;
  perform set_config('shoperation.instance_id',p_instance_id::text,true);
  response:=public.place_order_provider_v3_idempotent(
    p_instance_id=>p_instance_id,p_idempotency_key=>p_idempotency_key,p_customer_email=>p_customer_email,p_billing_name=>p_billing_name,
    p_billing_company=>p_billing_company,p_billing_tax_number=>p_billing_tax_number,p_billing_postcode=>p_billing_postcode,p_billing_city=>p_billing_city,p_billing_address=>p_billing_address,
    p_shipping_name=>p_shipping_name,p_shipping_postcode=>p_shipping_postcode,p_shipping_city=>p_shipping_city,p_shipping_address=>p_shipping_address,p_customer_phone=>p_customer_phone,
    p_shipping_provider=>p_shipping_provider,p_shipping_kind=>p_shipping_kind,p_shipping_fee_huf=>p_shipping_fee_huf,p_free_shipping_threshold_huf=>p_free_shipping_threshold_huf,
    p_parcel_point_id=>p_parcel_point_id,p_payment_provider=>p_payment_provider,p_note=>p_note,p_customer_id=>p_customer_id,p_coupon_code=>p_coupon_code,p_items=>p_items
  );
  if coalesce(response->>'instance_id','')<>p_instance_id::text then raise exception 'Checkout tenant context verification failed.';end if;
  return response;
end $$;

revoke all on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) to service_role;
