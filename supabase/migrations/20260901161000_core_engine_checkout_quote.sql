-- Core Engine 2.0: side-effect-free authoritative checkout quotation.
create or replace function public.quote_tenant_checkout_v1(
  p_instance_id uuid,p_customer_id uuid default null,p_coupon_code text default '',p_shipping_kind text default 'pickup',
  p_shipping_fee_huf integer default 0,p_free_shipping_threshold_huf integer default 0,p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_item jsonb; v_variant record; v_qty integer; v_subtotal integer:=0; v_discount integer:=0; v_shipping integer:=0;
  v_coupon record; v_code text:=upper(trim(coalesce(p_coupon_code,''))); v_role public.customer_role; v_reseller boolean:=false; v_price integer; v_lines jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.'; end if;
  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.profiles where id=p_customer_id; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin v_qty:=(v_item->>'quantity')::integer; exception when others then raise exception 'Érvénytelen mennyiség.'; end;
    if v_qty<1 or v_qty>99 then raise exception 'Érvénytelen mennyiség.'; end if;
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
  if p_shipping_kind='pickup' or (v_subtotal-v_discount)>=greatest(0,p_free_shipping_threshold_huf) and p_free_shipping_threshold_huf>0 then v_shipping:=0; else v_shipping:=greatest(0,p_shipping_fee_huf); end if;
  return jsonb_build_object('items',v_lines,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',greatest(0,v_subtotal-v_discount)+v_shipping,'coupon_code',nullif(v_code,''));
end $$;
revoke all on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) to service_role;
