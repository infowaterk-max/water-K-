-- V18: read models for post-release governance.
create or replace view public.post_release_session_queue with(security_invoker=true) as
select s.id as session_id,s.session_key,s.release_candidate_id,s.source_sha,s.status,s.started_at,s.observation_ends_at,s.stable_at,s.closed_at,
 r.version_label,r.source_ref,r.risk_class,
 count(e.id)::integer as evidence_count,count(e.id) filter(where e.trusted)::integer as trusted_evidence_count,
 count(e.id) filter(where e.trusted and e.status='pass')::integer as trusted_passes,
 count(f.id) filter(where f.status in('open','acknowledged') and f.severity='critical')::integer as critical_open,
 count(f.id) filter(where f.status in('open','acknowledged') and f.severity='high')::integer as high_open,
 md5(coalesce(string_agg(distinct e.evidence_hash,'|' order by e.evidence_hash),'')) as evidence_bundle_hash
from public.post_release_sessions s join public.release_candidates r on r.id=s.release_candidate_id
left join public.post_release_evidence e on e.session_id=s.id left join public.post_release_findings f on f.session_id=s.id
group by s.id,r.version_label,r.source_ref,r.risk_class;
revoke all on public.post_release_session_queue from public,anon,authenticated;grant select on public.post_release_session_queue to service_role;

create or replace view public.post_release_findings_queue with(security_invoker=true) as
select f.id as finding_id,f.session_id,f.finding_key,f.severity,f.status,f.title,f.description,f.occurrence_count,f.first_detected_at,f.last_detected_at,
 e.check_kind,e.source,e.status as evidence_status,e.trusted,e.observed_at,e.evidence_hash
from public.post_release_findings f left join public.post_release_evidence e on e.id=f.last_evidence_id
where f.status in('open','acknowledged');
revoke all on public.post_release_findings_queue from public,anon,authenticated;grant select on public.post_release_findings_queue to service_role;

create or replace view public.post_release_kpis with(security_invoker=true) as
select count(*) filter(where status='observing')::integer as observing,count(*) filter(where status='degraded')::integer as degraded,
 count(*) filter(where status='rollback_recommended')::integer as rollback_recommended,count(*) filter(where status='stable')::integer as stable,
 count(*) filter(where status='closed')::integer as closed,
 count(*) filter(where status not in('closed','cancelled') and observation_ends_at<now())::integer as overdue
from public.post_release_sessions;
revoke all on public.post_release_kpis from public,anon,authenticated;grant select on public.post_release_kpis to service_role;
