-- V16: assurance score, freshness and readiness read models.
create or replace view public.assurance_latest_control_results with(security_invoker=true) as
select distinct on(c.control_key) c.control_key,c.version,c.name,c.category,c.severity,c.weight,c.freshness_minutes,
 e.status,e.captured_at,e.source_observed_at,e.evidence,e.evidence_hash,
 case when e.captured_at is null or e.captured_at<now()-make_interval(mins=>c.freshness_minutes) then true else false end as stale
from public.assurance_controls c
left join public.assurance_evidence e on e.control_id=c.id
where c.enabled
order by c.control_key,c.version desc,e.captured_at desc nulls last;
revoke all on public.assurance_latest_control_results from public,anon,authenticated;grant select on public.assurance_latest_control_results to service_role;

create or replace view public.assurance_finding_queue with(security_invoker=true) as
select f.id as finding_id,f.finding_key,f.status,f.severity,f.title,f.description,f.occurrence_count,f.first_detected_at,f.incident_started_at,f.last_detected_at,
 round((extract(epoch from(now()-f.incident_started_at))/3600)::numeric,1) as age_hours,f.accepted_risk_reason,f.accepted_risk_expires_at,
 c.control_key,c.version as control_version,c.name as control_name,c.category,c.weight,e.evidence,e.evidence_hash,e.captured_at as evidence_captured_at
from public.assurance_findings f join public.assurance_controls c on c.id=f.control_id left join public.assurance_evidence e on e.id=f.last_evidence_id
where f.status in ('open','acknowledged','accepted_risk');
revoke all on public.assurance_finding_queue from public,anon,authenticated;grant select on public.assurance_finding_queue to service_role;

create or replace view public.assurance_readiness with(security_invoker=true) as
with latest as(select * from public.assurance_latest_control_results),score as(
 select coalesce(sum(weight),0) total_weight,coalesce(sum(weight) filter(where status='pass' and not stale),0) passed_weight,
 count(*)::integer controls,count(*) filter(where status='pass' and not stale)::integer fresh_passes,count(*) filter(where stale)::integer stale_controls from latest),
 findings as(select count(*) filter(where status in('open','acknowledged') and severity='critical')::integer critical_open,count(*) filter(where status in('open','acknowledged') and severity='high')::integer high_open,count(*) filter(where status='accepted_risk')::integer accepted_risks from public.assurance_findings)
select case when score.total_weight=0 then 0 else round(100.0*score.passed_weight/score.total_weight) end::integer as assurance_score,
 score.controls,score.fresh_passes,score.stale_controls,findings.critical_open,findings.high_open,findings.accepted_risks,
 case when findings.critical_open>0 then 'blocked' when score.stale_controls>0 or findings.high_open>0 then 'degraded' when score.total_weight=0 then 'unknown' else 'ready' end as readiness_status
from score cross join findings;
revoke all on public.assurance_readiness from public,anon,authenticated;grant select on public.assurance_readiness to service_role;

create or replace view public.assurance_recent_runs with(security_invoker=true) as
select id,run_key,status,started_at,completed_at,controls_checked,controls_passed,controls_failed,
 md5(coalesce((select string_agg(e.evidence_hash,'|' order by e.control_id::text,e.evidence_key) from public.assurance_evidence e where e.run_id=r.id),'')) as evidence_bundle_hash
from public.assurance_runs r order by started_at desc;
revoke all on public.assurance_recent_runs from public,anon,authenticated;grant select on public.assurance_recent_runs to service_role;
