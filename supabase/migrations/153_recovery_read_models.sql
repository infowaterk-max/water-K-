-- V19: recovery readiness and admin read models.
create or replace view public.recovery_service_readiness with(security_invoker=true) as
with latest_objectives as(
 select distinct on(service_key) * from public.recovery_objectives where enabled order by service_key,version desc
),latest_backup as(
 select distinct on(objective_id) objective_id,status,observed_at,source,trusted,evidence_hash from public.recovery_evidence where evidence_kind='backup' and trusted order by objective_id,observed_at desc,captured_at desc
),latest_restore as(
 select distinct on(objective_id) objective_id,status,observed_at,source,trusted,evidence_hash from public.recovery_evidence where evidence_kind='restore' and trusted order by objective_id,observed_at desc,captured_at desc
),latest_drill as(
 select distinct on(objective_id) objective_id,status,completed_at,measured_rto_minutes,measured_rpo_minutes,restore_validated from public.recovery_drills where status in('passed','failed') order by objective_id,completed_at desc nulls last
),findings as(
 select objective_id,count(*) filter(where status in('open','acknowledged') and severity='critical')::integer critical_open,count(*) filter(where status in('open','acknowledged') and severity='high')::integer high_open from public.recovery_findings group by objective_id
)
select o.id as objective_id,o.service_key,o.version,o.name,o.criticality,o.rto_minutes,o.rpo_minutes,o.backup_freshness_minutes,o.drill_interval_days,
 b.status as backup_status,b.observed_at as backup_observed_at,b.source as backup_source,b.evidence_hash as backup_hash,
 r.status as restore_status,r.observed_at as restore_observed_at,r.source as restore_source,r.evidence_hash as restore_hash,
 d.status as drill_status,d.completed_at as drill_completed_at,d.measured_rto_minutes,d.measured_rpo_minutes,d.restore_validated,
 coalesce(f.critical_open,0) critical_open,coalesce(f.high_open,0) high_open,
 case when b.observed_at is null or b.observed_at<now()-make_interval(mins=>o.backup_freshness_minutes) then true else false end backup_stale,
 case when d.completed_at is null or d.completed_at<now()-make_interval(days=>o.drill_interval_days) then true else false end drill_overdue,
 case when coalesce(f.critical_open,0)>0 then 'blocked'
      when b.status='pass' and r.status='pass' and d.status='passed' and coalesce(f.high_open,0)=0
       and b.observed_at>=now()-make_interval(mins=>o.backup_freshness_minutes)
       and d.completed_at>=now()-make_interval(days=>o.drill_interval_days) then 'ready'
      else 'degraded' end as readiness_status
from latest_objectives o left join latest_backup b on b.objective_id=o.id left join latest_restore r on r.objective_id=o.id left join latest_drill d on d.objective_id=o.id left join findings f on f.objective_id=o.id;
revoke all on public.recovery_service_readiness from public,anon,authenticated;grant select on public.recovery_service_readiness to service_role;

create or replace view public.recovery_finding_queue with(security_invoker=true) as
select f.id as finding_id,f.finding_key,f.finding_type,f.severity,f.status,f.title,f.description,f.occurrence_count,f.first_detected_at,f.last_detected_at,
 o.service_key,o.name as service_name,o.criticality,o.rto_minutes,o.rpo_minutes
from public.recovery_findings f join public.recovery_objectives o on o.id=f.objective_id
where f.status in('open','acknowledged') order by case f.severity when 'critical' then 1 when 'high' then 2 else 3 end,f.last_detected_at desc;
revoke all on public.recovery_finding_queue from public,anon,authenticated;grant select on public.recovery_finding_queue to service_role;

create or replace view public.recovery_kpis with(security_invoker=true) as
select count(*)::integer services,
 count(*) filter(where readiness_status='ready')::integer ready,
 count(*) filter(where readiness_status='degraded')::integer degraded,
 count(*) filter(where readiness_status='blocked')::integer blocked,
 count(*) filter(where backup_stale)::integer stale_backups,
 count(*) filter(where drill_overdue)::integer overdue_drills
from public.recovery_service_readiness;
revoke all on public.recovery_kpis from public,anon,authenticated;grant select on public.recovery_kpis to service_role;
