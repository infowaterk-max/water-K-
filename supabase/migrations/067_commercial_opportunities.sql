-- V10: unified commercial opportunity queue
create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_key text not null unique,
  channel text not null check (channel in ('b2c','b2b')),
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text,
  reseller_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('retention','winback','checkout_recovery','reorder','manual')),
  status text not null default 'open' check (status in ('open','in_progress','won','lost','dismissed')),
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  expected_value_net_huf numeric(14,2) not null default 0 check (expected_value_net_huf >= 0),
  probability_percent numeric(5,2) not null default 25 check (probability_percent between 0 and 100),
  due_at timestamptz,
  reason text not null,
  recommended_action text,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (customer_id is not null or customer_email is not null or reseller_id is not null)
);

create index if not exists commercial_opportunities_open_idx on public.commercial_opportunities(status, priority_score desc, due_at asc);
create index if not exists commercial_opportunities_customer_idx on public.commercial_opportunities(customer_id, status);
create index if not exists commercial_opportunities_reseller_idx on public.commercial_opportunities(reseller_id, status);

alter table public.commercial_opportunities enable row level security;
revoke all on public.commercial_opportunities from anon, authenticated;
grant all on public.commercial_opportunities to service_role;

create or replace function public.plan_commercial_opportunities()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b2c integer := 0;
  v_b2b integer := 0;
begin
  insert into public.commercial_opportunities(
    opportunity_key,channel,customer_id,customer_email,kind,priority_score,
    expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2c:'||c.customer_key||':'||c.segment,
    'b2c',c.customer_id,c.email_key,
    case when c.segment in ('winback','dormant') then 'winback' else 'retention' end,
    case when c.segment='at_risk' then 80 when c.segment='winback' then 90 when c.segment='dormant' then 70 else 50 end,
    round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
    case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
    now(),
    'V9 customer segment: '||c.segment,
    case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
    jsonb_build_object(
      'segment',c.segment,
      'revenue_gross_huf',c.revenue_gross_huf,
      'aov_gross_huf',c.aov_gross_huf,
      'days_since_last_order',c.days_since_last_order,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.customer_commercial_metrics c
  where c.segment in ('at_risk','winback','dormant')
  on conflict (opportunity_key) do update set
    customer_id=excluded.customer_id,
    customer_email=excluded.customer_email,
    kind=excluded.kind,
    priority_score=excluded.priority_score,
    expected_value_net_huf=excluded.expected_value_net_huf,
    probability_percent=excluded.probability_percent,
    due_at=excluded.due_at,
    reason=excluded.reason,
    recommended_action=excluded.recommended_action,
    source=excluded.source,
    updated_at=now()
  where public.commercial_opportunities.status in ('open','in_progress');
  get diagnostics v_b2c = row_count;

  insert into public.commercial_opportunities(
    opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,
    probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2b:'||r.customer_id::text||':reorder',
    'b2b',r.customer_id,'reorder',r.priority_score,
    round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),
    case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 when r.priority_band='medium' then 35 else 20 end,
    case
      when r.avg_reorder_days is not null then r.last_order_at + make_interval(days => greatest(1,r.avg_reorder_days))
      else r.last_order_at
    end,
    'V9 reseller priority: '||r.priority_band,
    r.recommended_action,
    jsonb_build_object(
      'priority_band',r.priority_band,
      'reorder_signal',r.reorder_signal,
      'days_since_last_order',r.days_since_last_order,
      'avg_reorder_days',r.avg_reorder_days,
      'days_overdue',case when r.avg_reorder_days is null then null else greatest(0,r.days_since_last_order-r.avg_reorder_days) end,
      'inactivity_risk',r.inactivity_risk,
      'estimated_reorder_value_gross_huf',r.estimated_reorder_value_gross_huf,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.reseller_growth_priorities r
  where r.customer_id is not null and r.priority_band in ('critical','high','medium')
  on conflict (opportunity_key) do update set
    reseller_id=excluded.reseller_id,
    priority_score=excluded.priority_score,
    expected_value_net_huf=excluded.expected_value_net_huf,
    probability_percent=excluded.probability_percent,
    due_at=excluded.due_at,
    reason=excluded.reason,
    recommended_action=excluded.recommended_action,
    source=excluded.source,
    updated_at=now()
  where public.commercial_opportunities.status in ('open','in_progress');
  get diagnostics v_b2b = row_count;

  return jsonb_build_object('b2c_upserts',v_b2c,'b2b_upserts',v_b2b);
end;
$$;
revoke all on function public.plan_commercial_opportunities() from public, anon, authenticated;
grant execute on function public.plan_commercial_opportunities() to service_role;

create or replace view public.commercial_pipeline_summary
with (security_invoker=true)
as
select channel,
       count(*) filter (where status in ('open','in_progress')) as open_count,
       coalesce(sum(expected_value_net_huf) filter (where status in ('open','in_progress')),0) as pipeline_net_huf,
       coalesce(sum(expected_value_net_huf * probability_percent / 100) filter (where status in ('open','in_progress')),0) as weighted_pipeline_net_huf,
       coalesce(sum(expected_value_net_huf) filter (where status in ('open','in_progress') and due_at < now()),0) as overdue_pipeline_net_huf,
       count(*) filter (where status='won') as won_count,
       count(*) filter (where status='lost') as lost_count
from public.commercial_opportunities
group by channel;
revoke all on public.commercial_pipeline_summary from public, anon, authenticated;
grant select on public.commercial_pipeline_summary to service_role;
