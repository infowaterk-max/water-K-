-- V17: release/change governance foundation. This layer authorizes decisions only; it never deploys.
create table if not exists public.release_policies(
 id uuid primary key default gen_random_uuid(), policy_key text not null, version integer not null check(version>0), name text not null,
 risk_class text not null check(risk_class in('standard','high_impact')), min_assurance_score integer not null default 95 check(min_assurance_score between 0 and 100),
 max_stale_controls integer not null default 0 check(max_stale_controls>=0), max_high_findings integer not null default 0 check(max_high_findings>=0), max_accepted_risks integer not null default 0 check(max_accepted_risks>=0),
 require_ci_green boolean not null default true, ci_freshness_minutes integer not null default 120 check(ci_freshness_minutes between 5 and 10080), require_rollback_plan boolean not null default true,
 approval_mode text not null default 'single' check(approval_mode in('single','dual')), evaluation_valid_minutes integer not null default 120 check(evaluation_valid_minutes between 5 and 10080),
 enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(policy_key,version),
 check(not(risk_class='high_impact' and approval_mode<>'dual'))
);
alter table public.release_policies enable row level security;revoke all on public.release_policies from public,anon,authenticated;grant select,insert,update on public.release_policies to service_role;

create table if not exists public.release_candidates(
 id uuid primary key default gen_random_uuid(), candidate_key text not null unique, version_label text not null, source_ref text not null, source_sha text not null,
 risk_class text not null check(risk_class in('standard','high_impact')), change_summary text not null, rollback_plan text,
 status text not null default 'draft' check(status in('draft','evaluated','ready','approved','rejected','expired','cancelled')),
 policy_id uuid not null references public.release_policies(id) on delete restrict,
 ci_status text not null default 'pending' check(ci_status in('pending','success','failure','cancelled')), ci_observed_at timestamptz, ci_evidence jsonb not null default '{}'::jsonb,
 assurance_run_id uuid references public.assurance_runs(id) on delete restrict, assurance_bundle_hash text, assurance_score integer check(assurance_score between 0 and 100),
 gate_snapshot jsonb, gate_hash text, evaluated_at timestamptz, expires_at timestamptz, approved_at timestamptz,rejected_at timestamptz,cancelled_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists release_candidates_queue_idx on public.release_candidates(status,risk_class,created_at desc);
alter table public.release_candidates enable row level security;revoke all on public.release_candidates from public,anon,authenticated;grant select,insert,update on public.release_candidates to service_role;

create table if not exists public.release_changes(
 id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.release_candidates(id) on delete restrict, change_key text not null,
 category text not null check(category in('code','database','configuration','content','integration','operations')), title text not null, description text not null,
 risk_level text not null default 'low' check(risk_level in('low','medium','high')), created_at timestamptz not null default now(), unique(candidate_id,change_key)
);
alter table public.release_changes enable row level security;revoke all on public.release_changes from public,anon,authenticated;grant select,insert on public.release_changes to service_role;

create table if not exists public.release_gate_results(
 id uuid primary key default gen_random_uuid(), gate_key text not null unique, candidate_id uuid not null references public.release_candidates(id) on delete restrict,
 gate_name text not null, status text not null check(status in('pass','fail','warning')), evidence jsonb not null default '{}'::jsonb, evidence_hash text not null, evaluated_at timestamptz not null default now()
);
alter table public.release_gate_results enable row level security;revoke all on public.release_gate_results from public,anon,authenticated;grant select,insert on public.release_gate_results to service_role;

create table if not exists public.release_approvals(
 id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.release_candidates(id) on delete restrict, slot integer not null check(slot in(1,2)),
 approver_id uuid not null references auth.users(id) on delete restrict, decision text not null check(decision in('approved','rejected')), note text, created_at timestamptz not null default now(),
 unique(candidate_id,slot),unique(candidate_id,approver_id)
);
alter table public.release_approvals enable row level security;revoke all on public.release_approvals from public,anon,authenticated;grant select,insert on public.release_approvals to service_role;

create table if not exists public.release_events(
 id bigint generated by default as identity primary key,event_key text not null unique,candidate_id uuid not null references public.release_candidates(id) on delete restrict,
 event_type text not null check(event_type in('created','ci_updated','evaluated','evaluation_invalidated','approval_added','approved','rejected','expired','cancelled')),
 actor_id uuid references auth.users(id) on delete set null,metadata jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
alter table public.release_events enable row level security;revoke all on public.release_events from public,anon,authenticated;grant select,insert on public.release_events to service_role;

insert into public.release_policies(policy_key,version,name,risk_class,min_assurance_score,max_stale_controls,max_high_findings,max_accepted_risks,approval_mode,evaluation_valid_minutes)
values('standard-release',1,'Standard release policy','standard',95,0,0,1,'single',120),('high-impact-release',1,'High impact release policy','high_impact',98,0,0,0,'dual',60)
on conflict(policy_key,version) do nothing;
