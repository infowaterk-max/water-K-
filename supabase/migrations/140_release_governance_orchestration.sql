-- V17: idempotent governance cycle for stale/expired authorization reconciliation.
create table if not exists public.release_governance_runs(
 id uuid primary key default gen_random_uuid(),run_key text not null unique,status text not null default 'running' check(status in('running','completed','failed')),invalidated_candidates integer not null default 0,started_at timestamptz not null default now(),completed_at timestamptz,metadata jsonb not null default '{}'::jsonb
);
alter table public.release_governance_runs enable row level security;revoke all on public.release_governance_runs from public,anon,authenticated;grant select,insert,update on public.release_governance_runs to service_role;

create or replace function public.process_release_governance_cycle(p_run_key text)
returns public.release_governance_runs language plpgsql security definer set search_path=''
as $$declare r public.release_governance_runs;v jsonb;begin if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('release-governance:'||p_run_key,0));select * into r from public.release_governance_runs where run_key=p_run_key;if found and r.status='completed' then return r;end if;if not found then insert into public.release_governance_runs(run_key) values(p_run_key) returning * into r;end if;v:=public.reconcile_release_candidates(p_run_key);update public.release_governance_runs set status='completed',invalidated_candidates=coalesce((v->>'invalidated')::integer,0),completed_at=now(),metadata=jsonb_build_object('reconcile',v) where id=r.id returning * into r;return r;exception when others then if r.id is not null then update public.release_governance_runs set status='failed',completed_at=now(),metadata=jsonb_build_object('error',sqlerrm) where id=r.id returning * into r;return r;end if;raise;end;$$;
revoke all on function public.process_release_governance_cycle(text) from public,anon,authenticated;grant execute on function public.process_release_governance_cycle(text) to service_role;

create or replace view public.release_recent_governance_runs with(security_invoker=true) as select id,run_key,status,invalidated_candidates,started_at,completed_at,metadata from public.release_governance_runs order by started_at desc;
revoke all on public.release_recent_governance_runs from public,anon,authenticated;grant select on public.release_recent_governance_runs to service_role;
