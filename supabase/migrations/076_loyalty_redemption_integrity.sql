-- V11: atomic point redemption, non-negative balance and governed benefit usage
create or replace function public.redeem_loyalty_points(p_customer_id uuid,p_points integer,p_event_key text,p_reason text,p_order_id uuid default null)
returns public.loyalty_ledger
language plpgsql security definer set search_path=''
as $$
declare v_balance bigint;v_row public.loyalty_ledger;begin
 if p_points<=0 then raise exception 'A beváltandó pontok száma pozitív kell legyen.'; end if;
 if nullif(trim(p_event_key),'') is null then raise exception 'Az eseménykulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text,0));
 if exists(select 1 from public.loyalty_ledger where event_key=p_event_key) then
   select * into v_row from public.loyalty_ledger where event_key=p_event_key;
   return v_row;
 end if;
 select coalesce(sum(points),0) into v_balance from public.loyalty_ledger where customer_id=p_customer_id;
 if v_balance<p_points then raise exception 'Nincs elegendő hűségpont.'; end if;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata)
 values(p_customer_id,p_event_key,'redeem',-p_points,p_order_id,coalesce(nullif(trim(p_reason),''),'Hűségpont beváltás'),jsonb_build_object('balance_before',v_balance,'balance_after',v_balance-p_points))
 returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.redeem_loyalty_points(uuid,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.redeem_loyalty_points(uuid,integer,text,text,uuid) to service_role;

create or replace function public.use_loyalty_benefit(p_customer_id uuid,p_rule_id uuid,p_usage_key text,p_order_id uuid default null)
returns public.loyalty_benefit_usage
language plpgsql security definer set search_path=''
as $$
declare r public.loyalty_benefit_rules;p public.customer_value_profiles;v_uses integer;v_order_total integer;v_row public.loyalty_benefit_usage;begin
 if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text||':'||p_rule_id::text,0));
 if exists(select 1 from public.loyalty_benefit_usage where usage_key=p_usage_key) then select * into v_row from public.loyalty_benefit_usage where usage_key=p_usage_key;return v_row;end if;
 select * into r from public.loyalty_benefit_rules where id=p_rule_id;
 if not found or not r.active then raise exception 'Az előny nem aktív.'; end if;
 if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
 if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
 select * into p from public.customer_value_profiles where customer_id=p_customer_id;
 if not found or p.value_tier<>r.value_tier then raise exception 'Az ügyfél nem jogosult erre az előnyre.'; end if;
 select count(*)::integer into v_uses from public.loyalty_benefit_usage where customer_id=p_customer_id and rule_id=p_rule_id;
 if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then raise exception 'Az előny felhasználási limitje elfogyott.'; end if;
 if p_order_id is not null then select total_gross_huf into v_order_total from public.orders where id=p_order_id and customer_id=p_customer_id;
   if not found then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
   if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
 elsif r.min_order_gross_huf>0 then raise exception 'Ehhez az előnyhöz rendelés szükséges.'; end if;
 if r.benefit_type='discount_percent' and r.minimum_margin_percent is null then raise exception 'Kedvezményes előny margin-korlát nélkül nem használható.'; end if;
 insert into public.loyalty_benefit_usage(usage_key,customer_id,rule_id,order_id,benefit_snapshot)
 values(p_usage_key,p_customer_id,p_rule_id,p_order_id,jsonb_build_object('rule_key',r.rule_key,'value_tier',r.value_tier,'benefit_type',r.benefit_type,'benefit_value',r.benefit_value,'minimum_margin_percent',r.minimum_margin_percent,'min_order_gross_huf',r.min_order_gross_huf)) returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.use_loyalty_benefit(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.use_loyalty_benefit(uuid,uuid,text,uuid) to service_role;

create or replace view public.customer_loyalty_summary with(security_invoker=true) as
select p.customer_id,p.value_score,p.value_tier,p.lifecycle_segment,p.paid_orders,p.revenue_gross_huf,p.last_order_at,
 coalesce(b.points_balance,0) as points_balance,coalesce(b.lifetime_earned_points,0) as lifetime_earned_points,coalesce(b.lifetime_redeemed_points,0) as lifetime_redeemed_points,
 (select count(*) from public.active_customer_benefits a where a.customer_id=p.customer_id and a.usage_available=true) as available_benefits
from public.customer_value_profiles p left join public.loyalty_balances b on b.customer_id=p.customer_id;
revoke all on public.customer_loyalty_summary from public,anon,authenticated;
grant select on public.customer_loyalty_summary to service_role;
