-- Close admin scope gaps: tenant-aware control-tower reads and webhook attribution.

alter table public.webhook_events
  add column if not exists instance_id uuid references public.webshop_instances(id) on delete set null;

update public.webhook_events w
set instance_id=pe.instance_id
from public.payment_events pe
where w.instance_id is null
  and w.external_event_id is not null
  and w.provider=pe.provider_code
  and w.external_event_id=pe.provider_event_id
  and pe.instance_id is not null;

create index if not exists webhook_events_instance_status_idx
  on public.webhook_events(instance_id,status,created_at desc)
  where instance_id is not null;

drop policy if exists "admins can read webhook events" on public.webhook_events;
revoke all on table public.webhook_events from public,anon,authenticated;
grant select,insert,update on table public.webhook_events to service_role;

create or replace view public.control_tower_queue_v2
with (security_invoker=true) as
select
  a.instance_id,
  a.id as alert_id,
  a.alert_key,
  a.category,
  a.alert_type,
  a.severity,
  a.priority_score,
  a.status,
  a.title,
  a.description,
  a.recommended_action,
  a.order_id,
  a.customer_id,
  a.reseller_id,
  a.variant_id,
  a.opportunity_id,
  a.evidence,
  a.occurrence_count,
  a.detected_at,
  a.last_detected_at,
  a.snoozed_until,
  round(extract(epoch from (now()-a.incident_started_at))/3600::numeric,1) as age_hours,
  t.id as task_id,
  t.status as task_status,
  t.owner_user_id,
  t.due_at as task_due_at,
  t.outcome as task_outcome,
  case when t.status in('open','in_progress') and t.due_at<now() then true else false end as task_overdue,
  a.incident_started_at
from public.control_alerts a
left join public.control_tasks t
  on t.instance_id=a.instance_id
 and t.alert_id=a.id
 and t.task_key='alert:'||a.id::text||':primary'
where a.status in('open','acknowledged','snoozed');

create or replace view public.control_tower_kpis_v2
with (security_invoker=true) as
select
  instance_id,
  count(*)::integer as open_alerts,
  count(*) filter(where severity='critical')::integer as critical_alerts,
  count(*) filter(where severity='high')::integer as high_alerts,
  count(*) filter(where age_hours>=24)::integer as over_24h_alerts,
  count(*) filter(where task_overdue)::integer as overdue_tasks,
  count(*) filter(where category='operations')::integer as operations_alerts,
  count(*) filter(where category='inventory')::integer as inventory_alerts,
  count(*) filter(where category='commercial')::integer as commercial_alerts,
  count(*) filter(where category='service')::integer as service_alerts,
  coalesce(sum((evidence->>'expected_value_net_huf')::numeric)
    filter(where category='commercial' and evidence?'expected_value_net_huf'),0) as commercial_value_at_risk_net_huf,
  coalesce(avg(age_hours),0) as avg_alert_age_hours,
  greatest(0,least(100,
    100
    - count(*) filter(where severity='critical')::integer*15
    - count(*) filter(where severity='high')::integer*7
    - count(*) filter(where task_overdue)::integer*5
    - count(*) filter(where age_hours>=24)::integer*2
  )) as control_health_score
from public.control_tower_queue_v2
group by instance_id;

create or replace view public.control_tower_category_summary_v2
with (security_invoker=true) as
select
  instance_id,
  category,
  severity,
  count(*)::integer as alert_count,
  max(priority_score) as max_priority,
  round(avg(extract(epoch from(now()-incident_started_at))/3600::numeric),1) as avg_age_hours
from public.control_alerts
where status in('open','acknowledged','snoozed')
group by instance_id,category,severity;

create or replace view public.control_system_health_v2
with (security_invoker=true) as
select
  w.id as instance_id,
  (select count(*)::integer from public.control_alerts a
    where a.instance_id=w.id and a.category='system' and a.status in('open','acknowledged','snoozed')) as open_system_alerts,
  (select count(*)::integer from public.control_alerts a
    where a.instance_id=w.id and a.category='system' and a.severity='critical' and a.status in('open','acknowledged','snoozed')) as critical_system_alerts,
  (select count(*)::integer from public.integration_jobs j
    where j.instance_id=w.id and j.status in('failed','blocked')) as failed_or_blocked_integration_jobs,
  (select count(*)::integer from public.webhook_events e
    where e.instance_id=w.id and e.status in('failed','rejected') and e.created_at>=now()-interval '7 days') as failed_webhooks_7d,
  (select max(r.completed_at) from public.control_processing_runs r where r.instance_id=w.id) as last_control_cycle_at
from public.webshop_instances w
where w.status in('pilot','active');

revoke all on public.control_tower_queue_v2 from public,anon,authenticated;
revoke all on public.control_tower_kpis_v2 from public,anon,authenticated;
revoke all on public.control_tower_category_summary_v2 from public,anon,authenticated;
revoke all on public.control_system_health_v2 from public,anon,authenticated;
grant select on public.control_tower_queue_v2 to service_role;
grant select on public.control_tower_kpis_v2 to service_role;
grant select on public.control_tower_category_summary_v2 to service_role;
grant select on public.control_system_health_v2 to service_role;
