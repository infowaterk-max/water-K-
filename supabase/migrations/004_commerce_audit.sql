create table if not exists public.order_events(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null, from_status public.order_status, to_status public.order_status,
  actor_user_id uuid references auth.users(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_id_idx on public.order_events(order_id,created_at desc);

create table if not exists public.inventory_events(
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null, change_quantity integer not null,
  previous_stock integer not null, new_stock integer not null, reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inventory_events_variant_id_idx on public.inventory_events(variant_id,created_at desc);
alter table public.order_events enable row level security;
alter table public.inventory_events enable row level security;
create policy "users can read permitted order events" on public.order_events for select to authenticated using(private.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "admins can read inventory events" on public.inventory_events for select to authenticated using(private.is_admin());

create or replace function public.place_order(
  p_customer_email text,p_billing_name text,p_billing_company text default '',p_billing_tax_number text default '',
  p_billing_postcode text default '',p_billing_city text default '',p_billing_address text default '',
  p_shipping_name text default '',p_shipping_postcode text default '',p_shipping_city text default '',p_shipping_address text default '',
  p_customer_phone text default '',p_shipping_method text default 'foxpost',p_parcel_point_id text default '',p_payment_method text default 'bank_transfer',p_note text default '',p_customer_id uuid default null,p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order_id uuid; v_order_number text; v_subtotal integer:=0; v_shipping integer:=0; v_total integer:=0; v_item jsonb; v_variant record; v_qty integer; v_role public.customer_role; v_reseller_approved boolean:=false; v_previous_stock integer;
begin
  if p_customer_email is null or length(trim(p_customer_email))<5 or length(p_customer_email)>254 then raise exception 'Érvénytelen e-mail cím.'; end if;
  if length(trim(p_billing_name))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.'; end if;
  if p_shipping_method not in ('foxpost','gls','mpl','pickup') then raise exception 'Érvénytelen szállítási mód.'; end if;
  if p_payment_method not in ('kh_card','bank_transfer') then raise exception 'Érvénytelen fizetési mód.'; end if;
  if p_shipping_method='foxpost' and length(trim(p_parcel_point_id))<2 then raise exception 'Foxpost automatát kell választani.'; end if;
  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller_approved from public.profiles where id=p_customer_id; end if;

  v_order_id:=gen_random_uuid(); v_order_number:='WK-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_order_id::text,'-',''),1,8));
  insert into public.orders(id,customer_id,order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,total_gross_huf,shipping_method,parcel_point_id,payment_method,note)
  values(v_order_id,p_customer_id,v_order_number,'pending',trim(p_customer_email),nullif(trim(p_customer_phone),''),trim(p_billing_name),nullif(trim(p_billing_company),''),nullif(trim(p_billing_tax_number),''),trim(p_billing_postcode),trim(p_billing_city),trim(p_billing_address),coalesce(nullif(trim(p_shipping_name),''),trim(p_billing_name)),coalesce(nullif(trim(p_shipping_postcode),''),trim(p_billing_postcode)),coalesce(nullif(trim(p_shipping_city),''),trim(p_billing_city)),coalesce(nullif(trim(p_shipping_address),''),trim(p_billing_address)),0,0,0,p_shipping_method,nullif(trim(p_parcel_point_id),''),p_payment_method,nullif(trim(p_note),''));
  insert into public.order_events(order_id,event_type,to_status,actor_user_id,metadata) values(v_order_id,'order_created','pending',p_customer_id,jsonb_build_object('payment_method',p_payment_method,'shipping_method',p_shipping_method));

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin v_qty:=(v_item->>'quantity')::integer; exception when others then raise exception 'Érvénytelen mennyiség.'; end;
    if v_qty<1 or v_qty>99 then raise exception 'Érvénytelen mennyiség.'; end if;
    select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.stock_quantity,pv.active,p.name as product_name,p.active as product_active into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid for update of pv;
    if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.'; end if;
    if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label; end if;
    if v_variant.sku='WK-25K' and not(v_role='reseller' and v_reseller_approved) then raise exception 'A 25 kg-os kiszerelés csak jóváhagyott viszonteladóknak rendelhető.'; end if;
    insert into public.order_items(order_id,variant_id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf) values(v_order_id,v_variant.id,v_variant.product_name,v_variant.label,v_variant.sku,v_qty,v_variant.gross_price_huf,v_variant.gross_price_huf*v_qty);
    v_previous_stock:=v_variant.stock_quantity;
    update public.product_variants set stock_quantity=stock_quantity-v_qty where id=v_variant.id;
    insert into public.inventory_events(variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(v_variant.id,v_order_id,-v_qty,v_previous_stock,v_previous_stock-v_qty,'order_created',p_customer_id,jsonb_build_object('sku',v_variant.sku,'order_number',v_order_number));
    v_subtotal:=v_subtotal+(v_variant.gross_price_huf*v_qty);
  end loop;

  if p_shipping_method='pickup' or v_subtotal>=50000 then v_shipping:=0; elsif p_shipping_method='foxpost' then v_shipping:=1490; elsif p_shipping_method='gls' then v_shipping:=2490; else v_shipping:=2390; end if;
  v_total:=v_subtotal+v_shipping;
  update public.orders set subtotal_gross_huf=v_subtotal,shipping_gross_huf=v_shipping,total_gross_huf=v_total,updated_at=now() where id=v_order_id;
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'subtotal_gross_huf',v_subtotal,'shipping_gross_huf',v_shipping,'total_gross_huf',v_total);
end; $$;
