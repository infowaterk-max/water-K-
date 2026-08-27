create table if not exists public.order_request_keys (
  idempotency_key text primary key,
  response jsonb,
  created_at timestamptz not null default now()
);

alter table public.order_request_keys enable row level security;
revoke all on public.order_request_keys from anon, authenticated;

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
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 16 or length(p_idempotency_key) > 120 then
    raise exception 'Érvénytelen rendelési kérésazonosító.';
  end if;

  begin
    insert into public.order_request_keys(idempotency_key) values(trim(p_idempotency_key));
  exception when unique_violation then
    select response into v_response from public.order_request_keys where idempotency_key=trim(p_idempotency_key);
    if v_response is null then raise exception 'A rendelés feldolgozása folyamatban van. Kérjük, próbáld újra rövidesen.'; end if;
    return v_response;
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

  update public.order_request_keys set response=v_response where idempotency_key=trim(p_idempotency_key);
  return v_response;
end;
$$;

revoke all on function public.place_order_idempotent(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order_idempotent(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) to service_role;

create index if not exists order_request_keys_created_at_idx on public.order_request_keys(created_at);
