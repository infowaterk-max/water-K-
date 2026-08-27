-- V17: change/freeze windows and release read models.
create table if not exists public.release_windows(
 id uuid primary key default gen_random_uuid(), window_key text not null unique, mode text not null check(mode in('allow','freeze')), name text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 risk_class text check(risk_class in('standard','high_impact')), reason text, enabled boolean not null default true, created_at timestamptz not null default now(), check(ends_at>starts_at)
);
alter table public.release_windows enable row level security;revoke all on public.release_windows from public,anon,authenticated;grant select,insert,update on public.release_windows to service_role;

create or replace function public.release_window_status(p_candidate_id uuid,p_at timestamptz default now())
returns jsonb language sql security definer set search_path=''
as $$with c as(select risk_class from public.release_candidates where id=p_candidate_id),f as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='freeze' and p_at>=w.starts_at and p_at<w.ends_at and(w.risk_class is null or w.risk_class=c.risk_class)),a as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='allow' and p_at>=w.starts_at and p_at<w.ends_at and(w.risk_class is null or w.risk_class=c.risk_class)),any_allow as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='allow' and(w.risk_class is null or w.risk_class=c.risk_class)) select jsonb_build_object('allowed',case when f.n>0 then false when any_allow.n>0 then a.n>0 else true end,'freeze_matches',f.n,'allow_matches',a.n,'evaluated_at',p_at) from f,a,any_allow$$;
revoke all on function public.release_window_status(uuid,timestamptz) from public,anon,authenticated;grant execute on function public.release_window_status(uuid,timestamptz) to service_role;

create or replace view public.release_candidate_queue with(security_invoker=true) as
select c.id as candidate_id,c.candidate_key,c.version_label,c.source_ref,c.source_sha,c.risk_class,c.change_summary,c.status,c.ci_status,c.ci_observed_at,c.assurance_score,c.assurance_bundle_hash,c.evaluated_at,c.expires_at,c.approved_at,c.created_at,
 p.policy_key,p.version as policy_version,p.name as policy_name,p.approval_mode,p.min_assurance_score,
 (select count(*) from public.release_approvals a where a.candidate_id=c.id and a.decision='approved')::integer as approval_count,
 public.release_candidate_is_stale(c.id) as stale,(public.release_window_status(c.id)->>'allowed')::boolean as window_allowed,
 (select count(*) from public.release_changes ch where ch.candidate_id=c.id)::integer as change_count,
 (select count(*) from public.release_changes ch where ch.candidate_id=c.id and ch.risk_level='high')::integer as high_risk_changes
from public.release_candidates c join public.release_policies p on p.id=c.policy_id;
revoke all on public.release_candidate_queue from public,anon,authenticated;grant select on public.release_candidate_queue to service_role;

create or replace view public.release_governance_kpis with(security_invoker=true) as
select count(*) filter(where status='draft')::integer as draft,count(*) filter(where status in('evaluated','ready'))::integer as awaiting_decision,count(*) filter(where status='approved')::integer as approved,
 count(*) filter(where status='rejected')::integer as rejected,count(*) filter(where status='expired')::integer as expired,
 count(*) filter(where status in('evaluated','ready','approved') and public.release_candidate_is_stale(id))::integer as stale_candidates,
 count(*) filter(where risk_class='high_impact' and status in('draft','evaluated','ready','approved'))::integer as high_impact_open
from public.release_candidates;
revoke all on public.release_governance_kpis from public,anon,authenticated;grant select on public.release_governance_kpis to service_role;
