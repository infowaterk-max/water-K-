-- V24: environment and rollout readiness control plane.
create table if not exists public.rollout_environments(
 id uuid primary key default gen_random_uuid(),
 environment_key text not null unique check(environment_key in('preview','staging','production')),
 display_name text not null,
 requires_manual_approval boolean not null default true,
 requires_smoke_pass boolean not null default true,
 requires_security_clearance boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.rollout_checks(
 id uuid primary key default gen_random_uuid(),
 check_key text not null unique,
 environment_key text not null references public.rollout_environments(environment_key) on delete restrict,
 source_sha text not null,
 check_kind text not null check(check_kind in('ci','environment','migration','smoke','security','integration','rollback')),
 status text not null check(status in('pass','fail','error')),
 trusted boolean not null default false,
 evidence_hash text not null,
 source text not null,
 observed_at timestamptz not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.rollout_decisions(
 id uuid primary key default gen_random_uuid(),
 decision_key text not null unique,
 environment_key text not null references public.rollout_environments(environment_key) on delete restrict,
 source_sha text not null,
 decision text not null check(decision in('go','no_go')),
 actor_id uuid not null references auth.users(id) on delete restrict,
 evidence_bundle_hash text not null,
 note text not null,
 created_at timestamptz not null default now()
);

insert into public.rollout_environments(environment_key,display_name,requires_manual_approval,requires_smoke_pass,requires_security_clearance)
values ('preview','Preview',false,true,true),('staging','Staging',true,true,true),('production','Production',true,true,true)
on conflict(environment_key) do nothing;

alter table public.rollout_environments enable row level security;
alter table public.rollout_checks enable row level security;
alter table public.rollout_decisions enable row level security;
revoke all on public.rollout_environments,public.rollout_checks,public.rollout_decisions from public,anon,authenticated;
grant select on public.rollout_environments,public.rollout_checks,public.rollout_decisions to service_role;

create or replace function public.block_rollout_ledger_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Rollout evidence és döntés append-only.';end;$$;
create trigger rollout_checks_immutable before update or delete on public.rollout_checks for each row execute function public.block_rollout_ledger_mutation();
create trigger rollout_decisions_immutable before update or delete on public.rollout_decisions for each row execute function public.block_rollout_ledger_mutation();

create or replace function public.record_rollout_check(p_check_key text,p_environment_key text,p_source_sha text,p_check_kind text,p_status text,p_trusted boolean,p_evidence_hash text,p_source text,p_observed_at timestamptz,p_metadata jsonb default '{}'::jsonb)
returns public.rollout_checks language plpgsql security definer set search_path='' as $$
declare r public.rollout_checks;begin
 if p_environment_key='production' and not p_trusted then raise exception 'Production rollout check csak trusted evidence lehet.';end if;
 select * into r from public.rollout_checks where check_key=p_check_key;if found then
  if r.environment_key<>p_environment_key or r.source_sha<>p_source_sha or r.check_kind<>p_check_kind or r.evidence_hash<>p_evidence_hash then raise exception 'A rollout check kulcs már más evidence-hez tartozik.';end if;return r;end if;
 insert into public.rollout_checks(check_key,environment_key,source_sha,check_kind,status,trusted,evidence_hash,source,observed_at,metadata)
 values(trim(p_check_key),p_environment_key,trim(p_source_sha),p_check_kind,p_status,p_trusted,trim(p_evidence_hash),trim(p_source),p_observed_at,coalesce(p_metadata,'{}'::jsonb)) returning * into r;return r;end;$$;
revoke all on function public.record_rollout_check(text,text,text,text,text,boolean,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.record_rollout_check(text,text,text,text,text,boolean,text,text,timestamptz,jsonb) to service_role;

create or replace view public.rollout_readiness with(security_invoker=true) as
select e.environment_key,e.display_name,c.source_sha,
 count(*) filter(where c.trusted and c.status='pass')::integer trusted_passes,
 count(*) filter(where c.trusted and c.status in('fail','error'))::integer trusted_failures,
 bool_or(c.check_kind='smoke' and c.trusted and c.status='pass') smoke_pass,
 bool_or(c.check_kind='security' and c.trusted and c.status='pass') security_pass,
 bool_or(c.check_kind='migration' and c.trusted and c.status='pass') migration_pass,
 md5(coalesce(string_agg(c.evidence_hash,'|' order by c.check_kind,c.evidence_hash),'')) evidence_bundle_hash
from public.rollout_environments e left join public.rollout_checks c on c.environment_key=e.environment_key
group by e.environment_key,e.display_name,c.source_sha;
revoke all on public.rollout_readiness from public,anon,authenticated;grant select on public.rollout_readiness to service_role;
