-- V10: pipeline aging, conversion and forecast decision support
create or replace view public.commercial_pipeline_decision_support
with (security_invoker=true)
as
select
  o.channel,
  case
    when o.status not in ('open','in_progress') then 'closed'
    when o.due_at is not null and o.due_at < now() then 'overdue'
    when o.created_at < now()-interval '30 days' then '30d_plus'
    when o.created_at < now()-interval '14 days' then '14_29d'
    when o.created_at < now()-interval '7 days' then '7_13d'
    else '0_6d'
  end as aging_bucket,
  count(*) as opportunity_count,
  coalesce(sum(o.expected_value_net_huf),0) as pipeline_net_huf,
  coalesce(sum(o.expected_value_net_huf*o.probability_percent/100),0) as weighted_pipeline_net_huf,
  coalesce(avg(o.priority_score),0) as avg_priority_score
from public.commercial_opportunities o
group by o.channel,2;
revoke all on public.commercial_pipeline_decision_support from public,anon,authenticated;
grant select on public.commercial_pipeline_decision_support to service_role;

create or replace view public.commercial_conversion_metrics
with (security_invoker=true)
as
select channel,
 count(*) as total_opportunities,
 count(*) filter(where status='won') as won_opportunities,
 count(*) filter(where status='lost') as lost_opportunities,
 count(*) filter(where status in ('open','in_progress')) as active_opportunities,
 round(100.0*count(*) filter(where status='won')/nullif(count(*) filter(where status in ('won','lost')),0),2) as win_rate_percent,
 coalesce(sum(expected_value_net_huf) filter(where status='won'),0) as won_expected_value_net_huf,
 coalesce(avg(extract(epoch from(closed_at-created_at))/86400) filter(where status='won' and closed_at is not null),0) as avg_days_to_win
from public.commercial_opportunities
group by channel;
revoke all on public.commercial_conversion_metrics from public,anon,authenticated;
grant select on public.commercial_conversion_metrics to service_role;

create or replace view public.commercial_executive_forecast
with (security_invoker=true)
as
select
  p.channel,
  p.open_count,
  p.pipeline_net_huf,
  p.weighted_pipeline_net_huf,
  p.overdue_pipeline_net_huf,
  coalesce(f.active_offer_count,0) as active_offer_count,
  coalesce(f.active_offer_net_huf,0) as active_offer_net_huf,
  coalesce(f.weighted_offer_net_huf,0) as weighted_offer_net_huf,
  coalesce(f.accepted_offer_count,0) as accepted_offer_count,
  coalesce(f.accepted_offer_net_huf,0) as accepted_offer_net_huf,
  coalesce(c.win_rate_percent,0) as historical_win_rate_percent,
  coalesce(c.avg_days_to_win,0) as avg_days_to_win
from public.commercial_pipeline_summary p
left join public.commercial_offer_forecast f on f.channel=p.channel
left join public.commercial_conversion_metrics c on c.channel=p.channel;
revoke all on public.commercial_executive_forecast from public,anon,authenticated;
grant select on public.commercial_executive_forecast to service_role;
