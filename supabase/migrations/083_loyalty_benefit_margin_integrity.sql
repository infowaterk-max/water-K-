-- V11 audit hardening: strict benefit idempotency and mandatory margin guard for monetary discounts
create or replace function public.use_loyalty_benefit(p_customer_id uuid,p_rule_id uuid,p_usage_key text,p_order_id uuid default null)
returns public.loyalty_benefit_usage
language plpgsql security definer set search_path=''
as $$
declare r public.loyalty_benefit_rules;p public.customer_value_profiles;v_uses integer;v_order_total integer;v_row public.loyalty_benefit_usage;begin
 if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text||':'||p_rule_id::text,0));
 select * into v_row from public.loyalty_benefit_usage where usage_key=p_usage_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.rule_id<>p_rule_id or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
     raise exception 'A használati kulcs már más benefit-művelethez tartozik.';
   end if;
   return v_row;
 end if;
 select * into r from public.loyalty_benefit_rules where id=p_rule_id;
 if not found or not r.active then raise exception 'Az előny nem aktív.'; end if;
 if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
 if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
 if r.benefit_type='discount_percent' then raise exception 'A százalékos kedvezmény csak margin-ellenőrzött benefit-függvényen keresztül használható.'; end if;
 select * into p from public.customer_value_profiles where customer_id=p_customer_id;
 if not found or p.value_tier<>r.value_tier then raise exception 'Az ügyfél nem jogosult erre az előnyre.'; end if;
 select count(*)::integer into v_uses from public.loyalty_benefit_usage where customer_id=p_customer_id and rule_id=p_rule_id;
 if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then raise exception 'Az előny felhasználási limitje elfogyott.'; end if;
 if p_order_id is not null then
   select total_gross_huf into v_order_total from public.orders where id=p_order_id and customer_id=p_customer_id;
   if not found then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
   if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
 elsif r.min_order_gross_huf>0 then raise exception 'Ehhez az előnyhöz rendelés szükséges.'; end if;
 insert into public.loyalty_benefit_usage(usage_key,customer_id,rule_id,order_id,benefit_snapshot)
 values(p_usage_key,p_customer_id,p_rule_id,p_order_id,jsonb_build_object('rule_key',r.rule_key,'value_tier',r.value_tier,'benefit_type',r.benefit_type,'benefit_value',r.benefit_value,'minimum_margin_percent',r.minimum_margin_percent,'min_order_gross_huf',r.min_order_gross_huf)) returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.use_loyalty_benefit(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.use_loyalty_benefit(uuid,uuid,text,uuid) to service_role;

create or replace function public.use_discount_loyalty_benefit(p_customer_id uuid,p_rule_id uuid,p_variant_id uuid,p_quantity integer,p_usage_key text,p_order_id uuid default null)
returns public.loyalty_benefit_usage
language plpgsql security definer set search_path=''
as $$
declare r public.loyalty_benefit_rules;p public.customer_value_profiles;v_uses integer;v_order_total integer;v_preview jsonb;v_row public.loyalty_benefit_usage;begin
 if p_quantity<=0 then raise exception 'A mennyiség pozitív kell legyen.'; end if;
 if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text||':'||p_rule_id::text,0));
 select * into v_row from public.loyalty_benefit_usage where usage_key=p_usage_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.rule_id<>p_rule_id or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid)
      or coalesce(v_row.benefit_snapshot->>'variant_id','')<>p_variant_id::text
      or coalesce((v_row.benefit_snapshot->>'quantity')::integer,0)<>p_quantity then
     raise exception 'A használati kulcs már más kedvezményes benefit-művelethez tartozik.';
   end if;
   return v_row;
 end if;
 select * into r from public.loyalty_benefit_rules where id=p_rule_id;
 if not found or not r.active or r.benefit_type<>'discount_percent' then raise exception 'Nem használható kedvezményes előny.'; end if;
 if r.benefit_value is null or r.benefit_value<=0 or r.benefit_value>100 then raise exception 'Érvénytelen kedvezményérték.'; end if;
 if r.minimum_margin_percent is null then raise exception 'A kedvezményes előnyhöz minimum margin kötelező.'; end if;
 if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
 if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
 select * into p from public.customer_value_profiles where customer_id=p_customer_id;
 if not found or p.value_tier<>r.value_tier then raise exception 'Az ügyfél nem jogosult erre az előnyre.'; end if;
 select count(*)::integer into v_uses from public.loyalty_benefit_usage where customer_id=p_customer_id and rule_id=p_rule_id;
 if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then raise exception 'Az előny felhasználási limitje elfogyott.'; end if;
 if p_order_id is not null then
   select total_gross_huf into v_order_total from public.orders where id=p_order_id and customer_id=p_customer_id;
   if not found then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
   if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
 elsif r.min_order_gross_huf>0 then raise exception 'Ehhez az előnyhöz rendelés szükséges.'; end if;
 select public.preview_promotion_margin(p_variant_id,r.benefit_value,r.minimum_margin_percent) into v_preview;
 if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'A kedvezmény nem teljesíti a margin-védelmet.'; end if;
 insert into public.loyalty_benefit_usage(usage_key,customer_id,rule_id,order_id,benefit_snapshot)
 values(p_usage_key,p_customer_id,p_rule_id,p_order_id,jsonb_build_object('rule_key',r.rule_key,'value_tier',r.value_tier,'benefit_type',r.benefit_type,'benefit_value',r.benefit_value,'minimum_margin_percent',r.minimum_margin_percent,'variant_id',p_variant_id,'quantity',p_quantity,'margin_preview',v_preview)) returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.use_discount_loyalty_benefit(uuid,uuid,uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.use_discount_loyalty_benefit(uuid,uuid,uuid,integer,text,uuid) to service_role;
