-- V11: loyalty refund/cancel reversals + governed tier benefits
create table if not exists public.loyalty_benefit_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  value_tier text not null check (value_tier in ('standard','silver','gold','platinum')),
  benefit_type text not null check (benefit_type in ('points_multiplier','fixed_points','discount_percent','free_shipping','manual_review')),
  benefit_value numeric(12,2),
  min_order_gross_huf integer not null default 0 check (min_order_gross_huf>=0),
  max_uses_per_customer integer check (max_uses_per_customer is null or max_uses_per_customer>0),
  minimum_margin_percent numeric(5,2) check (minimum_margin_percent is null or minimum_margin_percent between 0 and 100),
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until>valid_from)
);
alter table public.loyalty_benefit_rules enable row level security;
revoke all on public.loyalty_benefit_rules from anon,authenticated;
grant all on public.loyalty_benefit_rules to service_role;

create table if not exists public.loyalty_benefit_usage (
  id uuid primary key default gen_random_uuid(),
  usage_key text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  rule_id uuid not null references public.loyalty_benefit_rules(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  benefit_snapshot jsonb not null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists loyalty_benefit_usage_customer_rule_idx on public.loyalty_benefit_usage(customer_id,rule_id,used_at desc);
alter table public.loyalty_benefit_usage enable row level security;
revoke all on public.loyalty_benefit_usage from anon,authenticated;
grant all on public.loyalty_benefit_usage to service_role;

insert into public.loyalty_benefit_rules(rule_key,value_tier,benefit_type,benefit_value,min_order_gross_huf,max_uses_per_customer,minimum_margin_percent,metadata)
values
 ('silver-points-boost','silver','points_multiplier',1.10,0,null,null,jsonb_build_object('description','10% pontszorzó, közvetlen árengedmény nélkül')),
 ('gold-points-boost','gold','points_multiplier',1.25,0,null,null,jsonb_build_object('description','25% pontszorzó, közvetlen árengedmény nélkül')),
 ('platinum-points-boost','platinum','points_multiplier',1.50,0,null,null,jsonb_build_object('description','50% pontszorzó, közvetlen árengedmény nélkül')),
 ('platinum-manual-review','platinum','manual_review',null,100000,null,null,jsonb_build_object('description','Nagy értékű előny személyes jóváhagyással'))
on conflict(rule_key) do nothing;

create or replace function public.reverse_loyalty_points_for_ineligible_orders()
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
  insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reverses_entry_id,reason,metadata,occurred_at)
  select e.customer_id,'order-reversal:'||e.order_id::text,'reversal',-abs(e.points),e.order_id,e.id,
         'Törölt vagy teljesen visszatérített rendelés pontjóváírásának visszavonása',
         jsonb_build_object('source_event_key',e.event_key,'reason','order_ineligible_after_accrual'),now()
  from public.loyalty_ledger e
  join public.orders o on o.id=e.order_id
  where e.entry_type='earn'
    and e.order_id is not null
    and (
      o.status='cancelled'
      or exists(
        select 1
        from public.return_cases rc
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

create or replace view public.active_customer_benefits
with (security_invoker=true)
as
select p.customer_id,p.value_tier,r.id as rule_id,r.rule_key,r.benefit_type,r.benefit_value,
       r.min_order_gross_huf,r.max_uses_per_customer,r.minimum_margin_percent,r.metadata,
       coalesce(u.use_count,0) as use_count,
       case when r.max_uses_per_customer is null then true else coalesce(u.use_count,0)<r.max_uses_per_customer end as usage_available
from public.customer_value_profiles p
join public.loyalty_benefit_rules r on r.value_tier=p.value_tier and r.active=true
left join lateral(
  select count(*)::integer as use_count from public.loyalty_benefit_usage x where x.customer_id=p.customer_id and x.rule_id=r.id
)u on true
where (r.valid_from is null or r.valid_from<=now()) and (r.valid_until is null or r.valid_until>now());
revoke all on public.active_customer_benefits from public,anon,authenticated;
grant select on public.active_customer_benefits to service_role;
