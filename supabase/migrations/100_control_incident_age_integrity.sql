-- V13 audit hardening: distinguish lifetime detection history from the current incident age.
alter table public.control_alerts add column if not exists incident_started_at timestamptz not null default now();
update public.control_alerts set incident_started_at=detected_at where incident_started_at is distinct from detected_at and occurrence_count=1;

create or replace function public.maintain_control_incident_started_at()
returns trigger language plpgsql security invoker set search_path=''
as $$begin
  if new.status='open' and old.status in ('resolved','dismissed') and old.status is distinct from new.status then
    new.incident_started_at:=now();
  end if;
  return new;
end;$$;
revoke all on function public.maintain_control_incident_started_at() from public,anon,authenticated;
drop trigger if exists maintain_control_incident_started_at_trigger on public.control_alerts;
create trigger maintain_control_incident_started_at_trigger before update of status on public.control_alerts for each row execute function public.maintain_control_incident_started_at();

create or replace view public.control_tower_queue with(security_invoker=true) as
select a.id as alert_id,a.alert_key,a.category,a.alert_type,a.severity,a.priority_score,a.status,a.title,a.description,a.recommended_action,
       a.order_id,a.customer_id,a.reseller_id,a.variant_id,a.opportunity_id,a.evidence,a.occurrence_count,a.detected_at,a.last_detected_at,a.snoozed_until,
       round((extract(epoch from(now()-a.incident_started_at))/3600)::numeric,1) as age_hours,
       t.id as task_id,t.status as task_status,t.owner_user_id,t.due_at as task_due_at,t.outcome as task_outcome,
       case when t.status in ('open','in_progress') and t.due_at<now() then true else false end as task_overdue,
       a.incident_started_at
from public.control_alerts a
left join public.control_tasks t on t.alert_id=a.id and t.task_key='alert:'||a.id::text||':primary'
where a.status in ('open','acknowledged','snoozed');
revoke all on public.control_tower_queue from public,anon,authenticated;
grant select on public.control_tower_queue to service_role;

create or replace view public.control_tower_category_summary with(security_invoker=true) as
select category,severity,count(*)::integer as alert_count,max(priority_score)::integer as max_priority,
       round(avg(extract(epoch from(now()-incident_started_at))/3600)::numeric,1) as avg_age_hours
from public.control_alerts
where status in ('open','acknowledged','snoozed')
group by category,severity;
revoke all on public.control_tower_category_summary from public,anon,authenticated;
grant select on public.control_tower_category_summary to service_role;
