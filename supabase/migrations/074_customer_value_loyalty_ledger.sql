-- V11: customer value profiles + immutable loyalty ledger
create table if not exists public.customer_value_profiles (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  email_key text,
  paid_orders integer not null default 0 check (paid_orders>=0),
  revenue_gross_huf bigint not null default 0 check (revenue_gross_huf>=0),
  aov_gross_huf integer not null default 0 check (aov_gross_huf>=0),
  days_since_last_order integer,
  lifecycle_segment text not null default 'new',
  value_score integer not null default 0 check (value_score between 0 and 100),
  value_tier text not null default 'standard' check (value_tier in ('standard','silver','gold','platinum')),
  first_order_at timestamptz,
  last_order_at timestamptz,
  recalculated_at timestamptz not null default now()
);
alter table public.customer_value_profiles enable row level security;
revoke all on public.customer_value_profiles from anon,authenticated;
grant all on public.customer_value_profiles to service_role;

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  event_key text not null unique,
  entry_type text not null check (entry_type in ('earn','redeem','expire','adjust','reversal')),
  points integer not null check (points<>0),
  order_id uuid references public.orders(id) on delete restrict,
  reverses_entry_id uuid references public.loyalty_ledger(id) on delete restrict,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((entry_type in ('redeem','expire','reversal') and points<0) or (entry_type in ('earn','adjust') and points<>0))
);
create index if not exists loyalty_ledger_customer_idx on public.loyalty_ledger(customer_id,occurred_at desc);
create index if not exists loyalty_ledger_order_idx on public.loyalty_ledger(order_id) where order_id is not null;
alter table public.loyalty_ledger enable row level security;
revoke all on public.loyalty_ledger from anon,authenticated;
grant all on public.loyalty_ledger to service_role;

create or replace view public.loyalty_balances
with (security_invoker=true)
as
select customer_id,coalesce(sum(points),0)::bigint as points_balance,
       coalesce(sum(points) filter(where points>0),0)::bigint as lifetime_earned_points,
       abs(coalesce(sum(points) filter(where entry_type='redeem'),0))::bigint as lifetime_redeemed_points,
       max(occurred_at) as last_activity_at
from public.loyalty_ledger
group by customer_id;
revoke all on public.loyalty_balances from public,anon,authenticated;
grant select on public.loyalty_balances to service_role;

create or replace function public.refresh_customer_value_profiles()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
  insert into public.customer_value_profiles(customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,days_since_last_order,lifecycle_segment,value_score,value_tier,first_order_at,last_order_at,recalculated_at)
  select m.customer_id,m.email_key,m.paid_orders,m.revenue_gross_huf,m.aov_gross_huf,m.days_since_last_order,m.segment,
         least(100,greatest(0,
           least(40,m.paid_orders*8)+
           least(40,(m.revenue_gross_huf/25000)::integer)+
           case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end
         )) as value_score,
         case
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=85 then 'platinum'
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=65 then 'gold'
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=40 then 'silver'
           else 'standard' end,
         m.first_order_at,m.last_order_at,now()
  from public.customer_commercial_metrics m
  where m.customer_id is not null
  on conflict(customer_id) do update set
    email_key=excluded.email_key,paid_orders=excluded.paid_orders,revenue_gross_huf=excluded.revenue_gross_huf,
    aov_gross_huf=excluded.aov_gross_huf,days_since_last_order=excluded.days_since_last_order,
    lifecycle_segment=excluded.lifecycle_segment,value_score=excluded.value_score,value_tier=excluded.value_tier,
    first_order_at=excluded.first_order_at,last_order_at=excluded.last_order_at,recalculated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end;$$;
revoke all on function public.refresh_customer_value_profiles() from public,anon,authenticated;
grant execute on function public.refresh_customer_value_profiles() to service_role;

create or replace function public.accrue_loyalty_points_from_paid_orders()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
  insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
  select o.customer_id,'order-earn:'||o.id::text,'earn',least(1000,greatest(1,floor(o.total_gross_huf/1000.0)::integer)),o.id,
         'Fizetett rendelés után jóváírt hűségpont',jsonb_build_object('order_total_gross_huf',o.total_gross_huf,'rule','1_point_per_1000_huf_gross','cap',1000),o.created_at
  from public.orders o
  where o.customer_id is not null and o.status in ('paid','processing','shipped','completed') and o.total_gross_huf>0
  on conflict(event_key) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end;$$;
revoke all on function public.accrue_loyalty_points_from_paid_orders() from public,anon,authenticated;
grant execute on function public.accrue_loyalty_points_from_paid_orders() to service_role;
