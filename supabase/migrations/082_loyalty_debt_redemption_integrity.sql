-- V11 audit hardening: debt-aware earning/redemption and strict idempotency ownership
create or replace function public.redeem_loyalty_points(p_customer_id uuid,p_points integer,p_event_key text,p_reason text,p_order_id uuid default null)
returns public.loyalty_ledger
language plpgsql security definer set search_path=''
as $$
declare v_raw_balance bigint;v_row public.loyalty_ledger;begin
 if p_points<=0 then raise exception 'A beváltandó pontok száma pozitív kell legyen.'; end if;
 if nullif(trim(p_event_key),'') is null then raise exception 'Az eseménykulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text,0));
 select * into v_row from public.loyalty_ledger where event_key=p_event_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.entry_type<>'redeem' or v_row.points<>-p_points or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
     raise exception 'Az eseménykulcs már más hűségművelethez tartozik.';
   end if;
   return v_row;
 end if;
 select coalesce(sum(points),0) into v_raw_balance from public.loyalty_ledger where customer_id=p_customer_id;
 if v_raw_balance<=0 or v_raw_balance<p_points then raise exception 'Nincs elegendő felhasználható hűségpont.'; end if;
 if p_order_id is not null and not exists(select 1 from public.orders where id=p_order_id and customer_id=p_customer_id) then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata)
 values(p_customer_id,p_event_key,'redeem',-p_points,p_order_id,coalesce(nullif(trim(p_reason),''),'Hűségpont beváltás'),jsonb_build_object('balance_before',v_raw_balance,'balance_after',v_raw_balance-p_points)) returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.redeem_loyalty_points(uuid,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.redeem_loyalty_points(uuid,integer,text,text,uuid) to service_role;

-- Expose debt explicitly: future positive earnings first reduce the raw negative ledger balance.
create or replace view public.loyalty_balances with(security_invoker=true) as
select customer_id,
 greatest(coalesce(sum(points),0),0)::bigint as points_balance,
 abs(least(coalesce(sum(points),0),0))::bigint as points_debt,
 coalesce(sum(points) filter(where points>0),0)::bigint as lifetime_earned_points,
 abs(coalesce(sum(points) filter(where entry_type='redeem'),0))::bigint as lifetime_redeemed_points,
 max(occurred_at) as last_activity_at
from public.loyalty_ledger group by customer_id;
revoke all on public.loyalty_balances from public,anon,authenticated;
grant select on public.loyalty_balances to service_role;

create or replace view public.customer_loyalty_summary with(security_invoker=true) as
select p.customer_id,p.value_score,p.value_tier,p.lifecycle_segment,p.paid_orders,p.revenue_gross_huf,p.last_order_at,
 coalesce(b.points_balance,0) as points_balance,coalesce(b.points_debt,0) as points_debt,
 coalesce(b.lifetime_earned_points,0) as lifetime_earned_points,coalesce(b.lifetime_redeemed_points,0) as lifetime_redeemed_points,
 (select count(*) from public.active_customer_benefits a where a.customer_id=p.customer_id and a.usage_available=true) as available_benefits
from public.customer_value_profiles p left join public.loyalty_balances b on b.customer_id=p.customer_id;
revoke all on public.customer_loyalty_summary from public,anon,authenticated;
grant select on public.customer_loyalty_summary to service_role;
