-- Tenant-specific B2C/B2B customer relationship and partner approval.

create table if not exists public.customer_instance_roles(
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.customer_role not null default 'customer',
  reseller_approved boolean not null default false,
  reseller_requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,user_id),
  constraint customer_instance_roles_customer_role_chk check(role in('customer','reseller')),
  constraint customer_instance_roles_approval_chk check((role='reseller') or (reseller_approved=false and approved_at is null)),
  constraint customer_instance_roles_approved_at_chk check(reseller_approved=false or approved_at is not null)
);
create index if not exists customer_instance_roles_partner_idx on public.customer_instance_roles(instance_id,role,reseller_approved,updated_at desc);
alter table public.customer_instance_roles enable row level security;
revoke all on table public.customer_instance_roles from public,anon,authenticated;
grant select on table public.customer_instance_roles to authenticated;
grant select,insert,update,delete on table public.customer_instance_roles to service_role;
drop policy if exists customer_instance_roles_self_select on public.customer_instance_roles;
create policy customer_instance_roles_self_select on public.customer_instance_roles for select to authenticated using((select auth.uid())=user_id);

-- Backfill only concrete webshop/customer relationships. Global profile role is historical input only.
insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved,reseller_requested_at,approved_at)
select distinct o.instance_id,o.customer_id,
  case when p.role='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,
  case when p.role='reseller' then coalesce(p.reseller_approved,false) else false end,
  case when p.role='reseller' then p.created_at else null end,
  case when p.role='reseller' and p.reseller_approved then coalesce(p.updated_at,p.created_at,now()) else null end
from public.orders o join public.profiles p on p.id=o.customer_id
where o.instance_id is not null and o.customer_id is not null and p.role<>'admin'
on conflict(instance_id,user_id) do nothing;

-- Single-store compatibility for partner requests created before tenant roles existed.
with active_count as(
  select count(*)::integer as n from public.webshop_instances where status in('pilot','active')
), only_store as(
  select id as instance_id from public.webshop_instances where status in('pilot','active') order by created_at,id limit 1
)
insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved,reseller_requested_at,approved_at)
select s.instance_id,p.id,
  case when p.role='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,
  case when p.role='reseller' then coalesce(p.reseller_approved,false) else false end,
  case when p.role='reseller' then p.created_at else null end,
  case when p.role='reseller' and p.reseller_approved then coalesce(p.updated_at,p.created_at,now()) else null end
from only_store s cross join active_count c join public.profiles p on true
where c.n=1 and p.role<>'admin'
on conflict(instance_id,user_id) do nothing;

-- raw_user_meta_data is request intent only: it can create an unapproved request, never authorization.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_account_type text:=coalesce(new.raw_user_meta_data->>'account_type','customer');v_requested_instance uuid;
begin
  insert into public.profiles(id,email,full_name,company_name,tax_number,role,reseller_approved)
  values(new.id,new.email,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),'customer'::public.customer_role,false)
  on conflict(id) do update set email=excluded.email;
  begin v_requested_instance:=nullif(trim(coalesce(new.raw_user_meta_data->>'requested_instance_id','')),'')::uuid;exception when others then v_requested_instance:=null;end;
  if v_requested_instance is not null and exists(select 1 from public.webshop_instances w where w.id=v_requested_instance and w.status in('pilot','active')) then
    insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved,reseller_requested_at)
    values(v_requested_instance,new.id,case when v_account_type='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,false,case when v_account_type='reseller' then now() else null end)
    on conflict(instance_id,user_id) do nothing;
  end if;
  return new;
end;$$;
revoke all on function private.handle_new_user() from public,anon,authenticated;

-- Authoritative quote uses the webshop-scoped partner relationship.
create or replace function public.quote_tenant_checkout_v1(
  p_instance_id uuid,p_customer_id uuid default null,p_coupon_code text default '',p_shipping_kind text default 'pickup',
  p_shipping_fee_huf integer default 0,p_free_shipping_threshold_huf integer default 0,p_items jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;
  v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_role public.customer_role;v_reseller boolean:=false;v_price integer;v_lines jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
  begin
    select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items
    from(select (e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;
  exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
  if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;
  for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
    v_qty:=(v_item->>'quantity')::integer;
    select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,p.name product_name,p.active product_active,p.audience product_audience
    into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id;
    if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;
    if coalesce(v_variant.product_audience,'retail')='professional' and not(v_role='reseller' and v_reseller) then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;
    if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
    v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
    v_subtotal:=v_subtotal+v_price*v_qty;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('variantId',v_variant.id,'productId',v_variant.product_id,'sku',v_variant.sku,'name',v_variant.product_name,'variantLabel',v_variant.label,'quantity',v_qty,'unitGrossHuf',v_price,'lineGrossHuf',v_price*v_qty,'availableQuantity',v_variant.stock_quantity));
  end loop;
  if v_code<>'' then
    select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code;
    if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;
    if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;
    if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;
    if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;
    if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;
    if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));
  end if;
  if p_shipping_kind='pickup' or((v_subtotal-v_discount)>=greatest(0,p_free_shipping_threshold_huf) and p_free_shipping_threshold_huf>0) then v_shipping:=0;else v_shipping:=greatest(0,p_shipping_fee_huf);end if;
  return jsonb_build_object('items',v_lines,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',greatest(0,v_subtotal-v_discount)+v_shipping,'coupon_code',nullif(v_code,''));
end$$;
revoke all on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.quote_tenant_checkout_v1(uuid,uuid,text,text,integer,integer,jsonb) to service_role;

-- Atomic checkout also creates a default tenant relationship for an authenticated customer.
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
 if p_shipping_provider!~'^[a-z0-9_-]{2,80}$' or p_payment_provider!~'^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.';end if;
 if p_shipping_kind not in('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.';end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 or p_free_shipping_threshold_huf<0 or p_free_shipping_threshold_huf>100000000 then raise exception 'Érvénytelen szállítási díj vagy küszöb.';end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.';end if;
 begin select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items from(select(e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
 if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
 v_key:=md5(p_instance_id::text||':'||trim(p_idempotency_key));v_fp:=md5(jsonb_build_object('instance',p_instance_id,'email',lower(trim(p_customer_email)),'name',trim(p_billing_name),'company',trim(coalesce(p_billing_company,'')),'tax',trim(coalesce(p_billing_tax_number,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'free_threshold',p_free_shipping_threshold_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',v_code,'items',v_items)::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(v_key,v_fp);exception when unique_violation then select response,request_fingerprint into v_existing,v_existing_fp from public.order_request_keys where idempotency_key=v_key;if v_existing_fp is not null and v_existing_fp<>v_fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.';end if;if v_existing is null then raise exception 'A rendelés feldolgozása folyamatban van.';end if;return v_existing||jsonb_build_object('idempotency_replayed',true);end;
 if p_customer_id is not null then insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved) values(p_instance_id,p_customer_id,'customer',false) on conflict(instance_id,user_id) do nothing;select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;
 if v_code<>'' then select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code for update;if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;end if;
 v_order_id:=gen_random_uuid();v_number:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_order_id::text,'-',''),1,8));
 insert into public.orders(id,instance_id,customer_id,order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,shipping_method,parcel_point_id,payment_method,note,coupon_code) values(v_order_id,p_instance_id,p_customer_id,v_number,'pending',trim(p_customer_email),nullif(trim(p_customer_phone),''),trim(p_billing_name),nullif(trim(p_billing_company),''),nullif(trim(p_billing_tax_number),''),trim(p_billing_postcode),trim(p_billing_city),trim(p_billing_address),coalesce(nullif(trim(p_shipping_name),''),trim(p_billing_name)),coalesce(nullif(trim(p_shipping_postcode),''),trim(p_billing_postcode)),coalesce(nullif(trim(p_shipping_city),''),trim(p_billing_city)),coalesce(nullif(trim(p_shipping_address),''),trim(p_billing_address)),0,0,0,0,p_shipping_provider,nullif(trim(p_parcel_point_id),''),p_payment_provider,nullif(trim(p_note),''),nullif(v_code,''));
 for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
  v_qty:=(v_item->>'quantity')::integer;
  select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,pv.unit_cost_net_huf,p.name product_name,p.active product_active,p.audience product_audience into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id for update of pv;
  if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;if coalesce(v_variant.product_audience,'retail')='professional' and not(v_role='reseller' and v_reseller) then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
  v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
  insert into public.order_items(instance_id,order_id,variant_id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf,unit_cost_net_huf_snapshot,cost_snapshot_source) values(p_instance_id,v_order_id,v_variant.id,v_variant.product_name,v_variant.label,v_variant.sku,v_qty,v_price,v_price*v_qty,v_variant.unit_cost_net_huf,case when v_variant.unit_cost_net_huf is null then null else 'variant' end);
  v_prev:=v_variant.stock_quantity;update public.product_variants set stock_quantity=stock_quantity-v_qty,updated_at=now() where id=v_variant.id and instance_id=p_instance_id;
  insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,v_variant.id,v_order_id,-v_qty,v_prev,v_prev-v_qty,'order_created',p_customer_id,jsonb_build_object('sku',v_variant.sku,'order_number',v_number,'unit_gross_huf',v_price));v_subtotal:=v_subtotal+v_price*v_qty;
 end loop;
 if v_code<>'' then if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id and instance_id=p_instance_id;end if;
 v_shipping:=case when p_shipping_kind='pickup' then 0 when p_free_shipping_threshold_huf>0 and(v_subtotal-v_discount)>=p_free_shipping_threshold_huf then 0 else p_shipping_fee_huf end;v_total:=greatest(0,v_subtotal-v_discount)+v_shipping;
 update public.orders set subtotal_gross_huf=v_subtotal,shipping_gross_huf=v_shipping,discount_gross_huf=v_discount,total_gross_huf=v_total,updated_at=now() where id=v_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'order_created','pending',p_customer_id,jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind));if v_code<>'' then insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'coupon_applied','pending',p_customer_id,jsonb_build_object('code',v_code,'discount_gross_huf',v_discount));end if;
 v_response:=jsonb_build_object('order_id',v_order_id,'order_number',v_number,'instance_id',p_instance_id,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',v_total,'coupon_code',nullif(v_code,''),'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider,'idempotency_replayed',false);update public.order_request_keys set response=v_response,request_fingerprint=v_fp where idempotency_key=v_key;return v_response;
end$$;
revoke all on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.place_order_provider_v4_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb) to service_role;

create or replace view public.reseller_reorder_signals_v2 with(security_invoker=true)as
with paid as(select o.instance_id,o.customer_id,lower(trim(o.customer_email))email_key,o.id order_id,o.created_at,o.total_gross_huf,lag(o.created_at)over(partition by o.instance_id,coalesce(o.customer_id::text,lower(trim(o.customer_email)))order by o.created_at)previous_order_at from public.orders o where o.status in('paid','processing','shipped','completed')),grouped as(select instance_id,coalesce(customer_id::text,email_key)customer_key,max(customer_id::text)::uuid customer_id,email_key,count(*)::integer paid_orders,sum(total_gross_huf)::bigint revenue_gross_huf,max(created_at)last_order_at,avg(extract(epoch from(created_at-previous_order_at))/86400)filter(where previous_order_at is not null)avg_reorder_days from paid group by instance_id,coalesce(customer_id::text,email_key),email_key)
select g.instance_id,g.customer_key,g.customer_id,p.email,p.full_name,p.company_name,g.paid_orders,g.revenue_gross_huf,g.last_order_at,round(g.avg_reorder_days)::integer avg_reorder_days,floor(extract(epoch from(now()-g.last_order_at))/86400)::integer days_since_last_order,case when g.paid_orders<2 or g.avg_reorder_days is null then 'learning' when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::integer+14))then'overdue' when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::integer-7))then'due_soon' else'healthy'end reorder_signal from grouped g join public.customer_instance_roles cir on cir.instance_id=g.instance_id and cir.user_id=g.customer_id join public.profiles p on p.id=g.customer_id where cir.role='reseller' and cir.reseller_approved=true;

create or replace view public.reseller_growth_priorities_v2 with(security_invoker=true)as
with base as(select r.*,case when r.paid_orders>0 then round(r.revenue_gross_huf::numeric/r.paid_orders)::bigint else 0 end avg_order_value_gross_huf,case when r.reorder_signal='overdue' and r.revenue_gross_huf>=250000 then 100 when r.reorder_signal='overdue' then 80 when r.reorder_signal='due_soon' and r.revenue_gross_huf>=250000 then 70 when r.reorder_signal='due_soon' then 55 when r.reorder_signal='learning' and r.revenue_gross_huf>=250000 then 45 else 20 end priority_score from public.reseller_reorder_signals_v2 r)
select b.*,greatest(0,b.avg_order_value_gross_huf)estimated_reorder_value_gross_huf,case when b.priority_score>=90 then'critical' when b.priority_score>=70 then'high' when b.priority_score>=50 then'medium' else'low'end priority_band,case when b.reorder_signal='overdue' then'Kapcsolatfelvétel és újrarendelési egyeztetés' when b.reorder_signal='due_soon' then'Proaktív utánrendelési emlékeztető' when b.reorder_signal='learning' then'Partnerciklus megfigyelése' else'Nincs azonnali teendő'end recommended_action,case when b.days_since_last_order>=180 then'dormant' when b.days_since_last_order>=90 then'inactive' when b.reorder_signal='overdue' then'late' else'active'end inactivity_risk from base b;

create or replace view public.v9_channel_retention_summary_v2 with(security_invoker=true)as
with paid as(select o.instance_id,o.id,o.customer_id,lower(trim(o.customer_email))email_key,o.created_at,o.total_gross_huf,case when cir.role='reseller' and cir.reseller_approved=true then'reseller' else'retail'end channel from public.orders o left join public.customer_instance_roles cir on cir.instance_id=o.instance_id and cir.user_id=o.customer_id where o.status in('paid','processing','shipped','completed')),customer_stats as(select instance_id,channel,coalesce(customer_id::text,email_key)customer_key,count(*)::integer orders_count,sum(total_gross_huf)revenue_gross_huf,min(created_at)first_order_at,max(created_at)last_order_at from paid group by instance_id,channel,coalesce(customer_id::text,email_key))
select instance_id,channel,count(*)::integer paying_customers,count(*)filter(where orders_count>=2)::integer repeat_customers,round(100.0*count(*)filter(where orders_count>=2)/nullif(count(*),0),1)repeat_rate_percent,sum(orders_count)::integer paid_orders,sum(revenue_gross_huf)::bigint revenue_gross_huf,round(sum(revenue_gross_huf)/nullif(sum(orders_count),0))::bigint aov_gross_huf,round(sum(revenue_gross_huf)/nullif(count(*),0))::bigint ltv_gross_huf,count(*)filter(where last_order_at>=now()-interval'90 days')::integer active_90d_customers,count(*)filter(where last_order_at<now()-interval'90 days')::integer inactive_90d_customers from customer_stats group by instance_id,channel;

create or replace view public.v9_growth_dashboard_v2 with(security_invoker=true)as
select w.id instance_id,(select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id)paying_customers,(select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment='vip')vip_customers,(select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment='at_risk')at_risk_customers,(select count(*)::integer from public.customer_commercial_metrics c where c.instance_id=w.id and c.segment in('winback','dormant'))winback_customers,(select coalesce(sum(c.revenue_gross_huf),0)::bigint from public.customer_commercial_metrics c where c.instance_id=w.id)customer_lifetime_revenue_gross_huf,(select count(*)::integer from public.checkout_recovery_intents r where r.instance_id=w.id and r.status='open' and r.expires_at>now())open_checkout_recoveries,(select count(*)::integer from public.customer_journeys j where j.instance_id=w.id and j.status='active')active_journeys,(select count(*)::integer from public.customer_journey_steps s where s.instance_id=w.id and s.status='pending' and s.scheduled_at<=now())due_journey_steps,(select count(*)::integer from public.reseller_reorder_signals_v2 r where r.instance_id=w.id and r.reorder_signal='overdue')overdue_resellers,(select count(*)::integer from public.reseller_reorder_signals_v2 r where r.instance_id=w.id and r.reorder_signal='due_soon')due_soon_resellers,now()calculated_at from public.webshop_instances w where w.status in('pilot','active');

revoke all on public.reseller_reorder_signals_v2 from public,anon,authenticated;revoke all on public.reseller_growth_priorities_v2 from public,anon,authenticated;revoke all on public.v9_channel_retention_summary_v2 from public,anon,authenticated;revoke all on public.v9_growth_dashboard_v2 from public,anon,authenticated;grant select on public.reseller_reorder_signals_v2 to service_role;grant select on public.reseller_growth_priorities_v2 to service_role;grant select on public.v9_channel_retention_summary_v2 to service_role;grant select on public.v9_growth_dashboard_v2 to service_role;
