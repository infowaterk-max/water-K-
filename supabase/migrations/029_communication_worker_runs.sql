-- V8: audit every communication worker execution.
create table if not exists public.communication_worker_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('cron','manual','internal')),
  status text not null check (status in ('running','success','failed')),
  recovered integer not null default 0,
  claimed integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  blocked integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists communication_worker_runs_started_idx on public.communication_worker_runs(started_at desc);
alter table public.communication_worker_runs enable row level security;
revoke all on table public.communication_worker_runs from anon,authenticated;
grant select,insert,update on table public.communication_worker_runs to service_role;
