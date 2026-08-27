create table if not exists public.integration_jobs(
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  kind text not null check (kind in ('payment_create','payment_callback','shipment_create','invoice_create')),
  provider text not null,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','blocked')),
  attempt_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  last_error text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists integration_jobs_status_idx on public.integration_jobs(status,next_attempt_at,created_at);
create index if not exists integration_jobs_order_idx on public.integration_jobs(order_id,created_at desc);
alter table public.integration_jobs enable row level security;
create policy "admins can read integration jobs" on public.integration_jobs for select to authenticated using(private.is_admin());
revoke insert,update,delete on public.integration_jobs from anon,authenticated;

create table if not exists public.webhook_events(
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text,
  signature_valid boolean not null default false,
  payload_hash text,
  status text not null default 'received' check(status in ('received','processed','ignored','rejected','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index if not exists webhook_events_provider_external_uidx on public.webhook_events(provider,external_event_id) where external_event_id is not null;
alter table public.webhook_events enable row level security;
create policy "admins can read webhook events" on public.webhook_events for select to authenticated using(private.is_admin());
revoke insert,update,delete on public.webhook_events from anon,authenticated;
