create or replace function public.create_store_order(
  p_customer_type public.customer_type,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_company_name text,
  p_tax_number text,
  p_billing_address text,
  p_shipping_address text,
  p_shipping_method text,
  p_parcel_point_id text,
  p_payment_method text,
  p_note text,
  p_shipping_fee integer,
  p_items jsonb
) returns table(order_id uuid, order_number bigint, total_gross integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_total integer := greatest(coalesce(p_shipping_fee, 0), 0);
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_line integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (
    user_id, status, customer_type, customer_email, customer_name, customer_phone,
    company_name, tax_number, billing_address, shipping_address, total_gross,
    shipping_method, parcel_point_id, payment_method, note
  ) values (
    auth.uid(), case when p_payment_method = 'kh_card' then 'pending_payment'::public.order_status else 'pending_transfer'::public.order_status end,
    p_customer_type, p_customer_email, p_customer_name, p_customer_phone,
    nullif(p_company_name, ''), nullif(p_tax_number, ''), p_billing_address, p_shipping_address, 0,
    p_shipping_method, nullif(p_parcel_point_id, ''), p_payment_method, nullif(p_note, '')
  ) returning id, public.orders.order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 then raise exception 'Invalid quantity'; end if;

    select * into v_product
    from public.products
    where id = (v_item->>'productId')::uuid and active = true
    for update;

    if not found or v_product.stock < v_quantity then
      raise exception 'Product unavailable or insufficient stock';
    end if;

    if not (p_customer_type = any(v_product.audience)) then
      raise exception 'Product unavailable for customer type';
    end if;

    v_line := v_product.gross_price * v_quantity;
    v_total := v_total + v_line;

    insert into public.order_items(order_id, product_id, product_name, quantity, unit_gross, line_gross)
    values(v_order_id, v_product.id, v_product.name, v_quantity, v_product.gross_price, v_line);

    update public.products set stock = stock - v_quantity where id = v_product.id;
  end loop;

  update public.orders set total_gross = v_total where id = v_order_id;
  return query select v_order_id, v_order_number, v_total;
end;
$$;

revoke all on function public.create_store_order(public.customer_type,text,text,text,text,text,text,text,text,text,text,text,integer,jsonb) from public;
grant execute on function public.create_store_order(public.customer_type,text,text,text,text,text,text,text,text,text,text,text,integer,jsonb) to anon, authenticated;

create policy "admins can read all orders"
on public.orders for select to authenticated
using (coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false));

create policy "admins can read all order items"
on public.order_items for select to authenticated
using (coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false));

create policy "admins can manage products"
on public.products for all to authenticated
using (coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false))
with check (coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false));
