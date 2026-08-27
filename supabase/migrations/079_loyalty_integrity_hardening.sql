-- V11 audit hardening: prevent repeated tier bonuses and reverse all order-earned points consistently
create table if not exists public.loyalty_program_settings(
  singleton boolean primary key default true check (singleton=true),
  tier_bonus_cutover_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.loyalty_program_settings(singleton) values(true) on conflict(singleton) do nothing;
alter table public.loyalty_program_settings enable row level security;
revoke all on public.loyalty_program_settings from anon,authenticated;
grant all on public.loyalty_program_settings to service_role;

create or replace function public.apply_loyalty_tier_bonus_points()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;v_cutover timestamptz;begin
 select tier_bonus_cutover_at into v_cutover from public.loyalty_program_settings where singleton=true;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select e.customer_id,
        'tier-bonus:'||e.order_id::text,
        'earn',
        greatest(1,round(e.points*(case p.value_tier when 'silver' then 0.10 when 'gold' then 0.25 when 'platinum' then 0.50 else 0 end))::integer),
        e.order_id,
        'Hűségszint alapján jóváírt extra pont',
        jsonb_build_object('base_event_key',e.event_key,'tier_at_bonus',p.value_tier,'base_points',e.points,'multiplier',case p.value_tier when 'silver' then 1.10 when 'gold' then 1.25 when 'platinum' then 1.50 else 1 end),
        now()
 from public.loyalty_ledger e
 join public.customer_value_profiles p on p.customer_id=e.customer_id
 where e.entry_type='earn'
   and e.event_key like 'order-earn:%'
   and e.order_id is not null
   and e.occurred_at>=v_cutover
   and p.value_tier in ('silver','gold','platinum')
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.apply_loyalty_tier_bonus_points() from public,anon,authenticated;
grant execute on function public.apply_loyalty_tier_bonus_points() to service_role;

create or replace function public.reverse_loyalty_points_for_ineligible_orders()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reverses_entry_id,reason,metadata,occurred_at)
 select e.customer_id,'order-reversal:'||e.id::text,'reversal',-abs(e.points),e.order_id,e.id,
        'Törölt vagy teljesen visszatérített rendelés pontjóváírásának visszavonása',
        jsonb_build_object('source_event_key',e.event_key,'reason','order_ineligible_after_accrual'),now()
 from public.loyalty_ledger e
 join public.orders o on o.id=e.order_id
 where e.entry_type='earn'
   and e.order_id is not null
   and (e.event_key like 'order-earn:%' or e.event_key like 'tier-bonus:%')
   and (
     o.status='cancelled'
     or exists(
       select 1 from public.return_cases rc
       where rc.order_id=o.id
       group by rc.order_id
       having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf
     )
   )
   and not exists(select 1 from public.loyalty_ledger r where r.reverses_entry_id=e.id and r.entry_type='reversal')
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.reverse_loyalty_points_for_ineligible_orders() from public,anon,authenticated;
grant execute on function public.reverse_loyalty_points_for_ineligible_orders() to service_role;

-- Keep the original view column order intact; CREATE OR REPLACE VIEW may only append new columns.
create or replace view public.loyalty_balances
with (security_invoker=true)
as
select customer_id,
       greatest(coalesce(sum(points),0),0)::bigint as points_balance,
       coalesce(sum(points) filter(where points>0),0)::bigint as lifetime_earned_points,
       abs(coalesce(sum(points) filter(where entry_type='redeem'),0))::bigint as lifetime_redeemed_points,
       max(occurred_at) as last_activity_at,
       abs(least(coalesce(sum(points),0),0))::bigint as points_debt
from public.loyalty_ledger
group by customer_id;
revoke all on public.loyalty_balances from public,anon,authenticated;
grant select on public.loyalty_balances to service_role;
