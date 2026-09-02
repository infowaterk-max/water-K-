-- Core Engine 2.0: canonical checkout lines and deterministic inventory locking.
-- Duplicate variant lines are aggregated before quotation/order creation and variants are locked in UUID order.

create or replace function public.quote_tenant_checkout_v1(
  p_instance_id uuid,p_customer_id uuid default null,p_coupon_code text default '',p_shipping_kind text default 'pickup',
  p_shipping_fee_huf integer default 0,p_free_shipping_threshold_huf integer default 0,p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_item jsonb; v_items jsonb; v_variant record; v_qty integer; v_subtotal integer:=0; v_discount integer:=0; v_shipping integer:=0;
  v_coupon record; v_code text:=upper(trim(coalesce(p_coupon_code,''))); v_role public.customer_role; v_reseller boolean:=false; v_price integer; v_lines jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.'; end if;

  begin
    select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id)
      into v_items
      from (
        select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) e
        group by (e->>'variant_id')::uuid
      ) n;
  exception when others then
    raise exception 'A kosár tartalma érvénytelen.';
  end;
  if v_items is null or exists(select 1 from jsonb_array_elements(v_items) e where (e->>'quantity')::integer<1 or (e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.'; end if;

  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.profiles where id=p_customer_id; end if;
  for v_item in select value from jsonb_array_elements(v_items) order by (value->>'variant_id')::uuid loop
    v_qty:=(v_item->>'quantity')::integer;
    select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,p.name product_name,p.active product_active
      into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
      where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id;
    if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.'; end if;
    if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label; end if;
    v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
    v_subtotal:=v_subtotal+v_price*v_qty;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('variantId',v_variant.id,'productId',v_variant.product_id,'sku',v_variant.sku,'name',v_variant.product_name,'variantLabel',v_variant.label,'quantity',v_qty,'unitGrossHuf',v_price,'lineGrossHuf',v_price*v_qty,'availableQuantity',v_variant.stock_quantity));
  end loop;
  if v_code<>'' then
    select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code;
    if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.'; end if;
    if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.'; end if;
    if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.'; end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.'; end if;
    if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.'; end if;
    if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer; else v_discount:=least(v_coupon.discount_value,v_subtotal); end if;
    if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf); end if;
    v_discount:=greatest(0,least(v_discount,v_subtotal));
  end if;
  if p_shipping_kind='pickup' or ((v_subtotal-v_discount)>=greatest(0,p_free_shipping_threshold_huf) and p_free_shipping_threshold_huf>0) then v_shipping:=0; else v_shipping:=greatest(0,p_shipping_fee_huf); end if;
  return jsonb_build_object('items',v_lines,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',greatest(0,v_subtotal-v_discount)+v_shipping,'coupon_code',nullif(v_code,''));
end $$;
revoke all on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) to service_role;

create or replace function public.place_order_provider_v4_idempotent(
 p_instance_id uuid,p_idempotency_key text,p_customer_email text,p_billing_name text,p_billing_company text default '',p_billing_tax_number text default '',p_billing_postcode text default '',p_billing_city text default '',p_billing_address text default '',p_shipping_name text default '',p_shipping_postcode text default '',p_shipping_city text default '',p_shipping_address text default '',p_customer_phone text default '',p_shipping_provider text default 'pickup',p_shipping_kind text default 'pickup',p_shipping_fee_huf integer default 0,p_free_shipping_threshold_huf integer default 0,p_parcel_point_id text default '',p_payment_provider text default 'bank_transfer',p_note text default '',p_customer_id uuid default null,p_coupon_code text default '',p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_key text;v_fp text;v_existing_fp text;v_existing jsonb;v_order_id uuid;v_number text;v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_role public.customer_role;v_reseller boolean:=false;v_price integer;v_prev integer;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;v_total integer:=0;v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_response jsonb;
begin
 if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.';end if;
 if p_customer_email is null or length(trim(p_customer_email))<5 or length(p_customer_email)>254 then raise exception 'Érvénytelen e-mail cím.';end if;
 if length(trim(coalesce(p_billing_name,'')))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.';end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
 if p_shipping_provider !~ '^[a-z0-9_-]{2,80}$' or p_payment_provider !~ '^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.';end if;
 if p_shipping_kind not in('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.';end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 or p_free_shipping_threshold_huf<0 or p_free_shipping_threshold_huf>100000000 then raise exception 'Érvénytelen szállítási díj vagy küszöb.';end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.';end if;
 begin
  select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id)
    into v_items
    from (
      select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
      group by (e->>'variant_id')::uuid
    ) n;
 exception when others then raise exception 'A kosár tartalma érvénytelen.'; end;
 if v_items is null or exists(select 1 from jsonb_array_elements(v_items) e where (e->>'quantity')::integer<1 or (e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
 v_key:=md5(p_instance_id::text||':'||trim(p_idempotency_key));
 v_fp:=md5(jsonb_build_object('instance',p_instance_id,'email',lower(trim(p_customer_email)),'name',trim(p_billing_name),'company',trim(coalesce(p_billing_company,'')),'tax',trim(coalesce(p_billing_tax_number,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'free_threshold',p_free_shipping_threshold_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',v_code,'items',v_items)::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(v_key,v_fp);exception when unique_violation then select response,request_fingerprint into v_existing,v_existing_fp from public.order_request_keys where idempotency_key=v_key;if v_existing_fp is not null and v_existing_fp<>v_fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.';end if;if v_existing is null then raise exception 'A rendelés feldolgozása folyamatban van.';end if;return v_existing||jsonb_build_object('idempotency_replayed',true);end;
 if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.profiles where id=p_customer_id;end if;
 if v_code<>'' then select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code for update;if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;end if;
 v_order_id:=gen_random_uuid();v_number:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_order_id::text,'-',''),1,8));
 insert into public.orders(id,instance_id,customer_id,order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,shipping_method,parcel_point_id,payment_method,note,coupon_code) values(v_order_id,p_instance_id,p_customer_id,v_number,'pending',trim(p_customer_email),nullif(trim(p_customer_phone),''),trim(p_billing_name),nullif(trim(p_billing_company),''),nullif(trim(p_billing_tax_number),''),trim(p_billing_postcode),trim(p_billing_city),trim(p_billing_address),coalesce(nullif(trim(p_shipping_name),''),trim(p_billing_name)),coalesce(nullif(trim(p_shipping_postcode),''),trim(p_billing_postcode)),coalesce(nullif(trim(p_shipping_city),''),trim(p_billing_city)),coalesce(nullif(trim(p_shipping_address),''),trim(p_billing_address)),0,0,0,0,p_shipping_provider,nullif(trim(p_parcel_point_id),''),p_payment_provider,nullif(trim(p_note),''),nullif(v_code,''));
 for v_item in select value from jsonb_array_elements(v_items) order by (value->>'variant_id')::uuid loop
  v_qty:=(v_item->>'quantity')::integer;
  select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,pv.unit_cost_net_huf,p.name product_name,p.active product_active into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id for update of pv;
  if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
  v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
  insert into public.order_items(instance_id,order_id,variant_id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf,unit_cost_net_huf_snapshot,cost_snapshot_source) values(p_instance_id,v_order_id,v_variant.id,v_variant.product_name,v_variant.label,v_variant.sku,v_qty,v_price,v_price*v_qty,v_variant.unit_cost_net_huf,case when v_variant.unit_cost_net_huf is null then null else 'variant' end);
  v_prev:=v_variant.stock_quantity;update public.product_variants set stock_quantity=stock_quantity-v_qty,updated_at=now() where id=v_variant.id and instance_id=p_instance_id;
  insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,v_variant.id,v_order_id,-v_qty,v_prev,v_prev-v_qty,'order_created',p_customer_id,jsonb_build_object('sku',v_variant.sku,'order_number',v_number,'unit_gross_huf',v_price));v_subtotal:=v_subtotal+v_price*v_qty;
 end loop;
 if v_code<>'' then if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id and instance_id=p_instance_id;end if;
 v_shipping:=case when p_shipping_kind='pickup' then 0 when p_free_shipping_threshold_huf>0 and (v_subtotal-v_discount)>=p_free_shipping_threshold_huf then 0 else p_shipping_fee_huf end;v_total:=greatest(0,v_subtotal-v_discount)+v_shipping;
 update public.orders set subtotal_gross_huf=v_subtotal,shipping_gross_huf=v_shipping,discount_gross_huf=v_discount,total_gross_huf=v_total,updated_at=now() where id=v_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'order_created','pending',p_customer_id,jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind));if v_code<>'' then insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'coupon_applied','pending',p_customer_id,jsonb_build_object('code',v_code,'discount_gross_huf',v_discount));end if;
 v_response:=jsonb_build_object('order_id',v_order_id,'order_number',v_number,'instance_id',p_instance_id,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',v_total,'coupon_code',nullif(v_code,''),'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider,'idempotency_replayed',false);update public.order_request_keys set response=v_response,request_fingerprint=v_fp where idempotency_key=v_key;return v_response;
end $$;
revoke all on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) to service_role;
