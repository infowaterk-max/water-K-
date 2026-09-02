-- V17 final integrity hardening: immutable candidate identity and window-aware staleness.
create or replace function public.guard_release_candidate_identity() returns trigger language plpgsql set search_path='' as $$begin
 if new.candidate_key is distinct from old.candidate_key or new.version_label is distinct from old.version_label or new.source_ref is distinct from old.source_ref or new.source_sha is distinct from old.source_sha or new.risk_class is distinct from old.risk_class or new.change_summary is distinct from old.change_summary or new.rollback_plan is distinct from old.rollback_plan or new.policy_id is distinct from old.policy_id or new.created_by is distinct from old.created_by then raise exception 'release_candidate_identity_immutable';end if;return new;end;$$;
drop trigger if exists guard_release_candidate_identity_trigger on public.release_candidates;create trigger guard_release_candidate_identity_trigger before update on public.release_candidates for each row execute function public.guard_release_candidate_identity();

create or replace function public.release_candidate_is_stale(p_candidate_id uuid)
returns boolean language sql security definer set search_path=''
as $$with c as(select * from public.release_candidates where id=p_candidate_id),pol as(select p.* from public.release_policies p join c on c.policy_id=p.id),latest as(select * from public.assurance_recent_runs where status='completed' order by completed_at desc nulls last limit 1),r as(select * from public.assurance_readiness),w as(select public.release_window_status(p_candidate_id) s)
select case when c.evaluated_at is null then true when c.expires_at<=now() then true when not pol.enabled then true when latest.id is null then true when c.assurance_bundle_hash is distinct from latest.evidence_bundle_hash then true when r.readiness_status<>'ready' or r.assurance_score<pol.min_assurance_score or r.stale_controls>pol.max_stale_controls or r.critical_open>0 or r.high_open>pol.max_high_findings or r.accepted_risks>pol.max_accepted_risks then true when pol.require_ci_green and(not public.release_ci_is_trusted(c.id) or c.ci_observed_at is null or c.ci_observed_at<now()-make_interval(mins=>pol.ci_freshness_minutes)) then true when coalesce((w.s->>'allowed')::boolean,false)=false then true else false end from c join pol on true left join latest on true cross join r cross join w$$;
revoke all on function public.release_candidate_is_stale(uuid) from public,anon,authenticated;grant execute on function public.release_candidate_is_stale(uuid) to service_role;

drop view if exists public.release_candidate_queue;
create or replace view public.release_candidate_queue with(security_invoker=true) as
select c.id as candidate_id,c.candidate_key,c.version_label,c.source_ref,c.source_sha,c.risk_class,c.change_summary,c.status,c.ci_status,c.ci_observed_at,public.release_ci_is_trusted(c.id) as ci_trusted,c.assurance_score,c.assurance_bundle_hash,c.evaluated_at,c.expires_at,c.approved_at,c.created_at,p.policy_key,p.version as policy_version,p.name as policy_name,p.approval_mode,p.min_assurance_score,
 (select count(*) from public.release_approvals a where a.candidate_id=c.id and a.gate_hash=c.gate_hash and a.decision='approved')::integer as approval_count,public.release_candidate_is_stale(c.id) as stale,(public.release_window_status(c.id)->>'allowed')::boolean as window_allowed,(select count(*) from public.release_changes ch where ch.candidate_id=c.id)::integer as change_count,(select count(*) from public.release_changes ch where ch.candidate_id=c.id and ch.risk_level='high')::integer as high_risk_changes
from public.release_candidates c join public.release_policies p on p.id=c.policy_id;
revoke all on public.release_candidate_queue from public,anon,authenticated;grant select on public.release_candidate_queue to service_role;

revoke insert,update,delete on public.release_candidates from service_role;
revoke update,delete on public.release_changes from service_role;
revoke delete on public.release_policies,public.release_windows from service_role;
