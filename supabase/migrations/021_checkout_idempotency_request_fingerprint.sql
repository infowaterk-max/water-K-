alter table public.order_request_keys
  add column if not exists request_fingerprint text;

create or replace function public.place_order_idempotent(
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
  p_shipping_method text default 'foxpost',
  p_parcel_point_id text default '',
  p_payment_method text default 'bank_transfer',
  p_note text default '',
  p_customer_id uuid default null,
  p_coupon_code text default '',
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response jsonb;
  v_request_fingerprint text;
  v_existing_fingerprint text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 16 or length(p_idempotency_key) > 120 then
    raise exception 'Érvénytelen rendelési kérésazonosító.';
  end if;

  v_request_fingerprint := md5(jsonb_build_object(
    'customer_email', lower(trim(coalesce(p_customer_email, ''))),
    'billing_name', trim(coalesce(p_billing_name, '')),
    'billing_company', trim(coalesce(p_billing_company, '')),
    'billing_tax_number', trim(coalesce(p_billing_tax_number, '')),
    'billing_postcode', trim(coalesce(p_billing_postcode, '')),
    'billing_city', trim(coalesce(p_billing_city, '')),
    'billing_address', trim(coalesce(p_billing_address, '')),
    'shipping_name', trim(coalesce(p_shipping_name, '')),
    'shipping_postcode', trim(coalesce(p_shipping_postcode, '')),
    'shipping_city', trim(coalesce(p_shipping_city, '')),
    'shipping_address', trim(coalesce(p_shipping_address, '')),
    'customer_phone', trim(coalesce(p_customer_phone, '')),
    'shipping_method', coalesce(p_shipping_method, ''),
    'parcel_point_id', trim(coalesce(p_parcel_point_id, '')),
    'payment_method', coalesce(p_payment_method, ''),
    'note', coalesce(p_note, ''),
    'customer_id', p_customer_id,
    'coupon_code', upper(trim(coalesce(p_coupon_code, ''))),
    'items', coalesce(p_items, '[]'::jsonb)
  )::text);

  begin
    insert into public.order_request_keys(idempotency_key, request_fingerprint)
    values(trim(p_idempotency_key), v_request_fingerprint);
  exception when unique_violation then
    select response, request_fingerprint
      into v_response, v_existing_fingerprint
      from public.order_request_keys
      where idempotency_key=trim(p_idempotency_key);

    if v_existing_fingerprint is not null and v_existing_fingerprint <> v_request_fingerprint then
      raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.';
    end if;
    if v_response is null then
      raise exception 'A rendelés feldolgozása folyamatban van. Kérjük, próbáld újra rövidesen.';
    end if;
    return v_response || jsonb_build_object('idempotency_replayed', true);
  end;

  v_response := public.place_order(
    p_customer_email => p_customer_email,
    p_billing_name => p_billing_name,
    p_billing_company => p_billing_company,
    p_billing_tax_number => p_billing_tax_number,
    p_billing_postcode => p_billing_postcode,
    p_billing_city => p_billing_city,
    p_billing_address => p_billing_address,
    p_shipping_name => p_shipping_name,
    p_shipping_postcode => p_shipping_postcode,
    p_shipping_city => p_shipping_city,
    p_shipping_address => p_shipping_address,
    p_customer_phone => p_customer_phone,
    p_shipping_method => p_shipping_method,
    p_parcel_point_id => p_parcel_point_id,
    p_payment_method => p_payment_method,
    p_note => p_note,
    p_customer_id => p_customer_id,
    p_coupon_code => p_coupon_code,
    p_items => p_items
  );

  update public.order_request_keys
    set response=v_response, request_fingerprint=v_request_fingerprint
    where idempotency_key=trim(p_idempotency_key);

  return v_response || jsonb_build_object('idempotency_replayed', false);
end;
$$;
