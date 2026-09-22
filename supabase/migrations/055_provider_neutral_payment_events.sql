create table if not exists public.payment_events (
 id uuid primary key default gen_random_uuid(),
 provider_code text not null,
 provider_event_id text not null,
 provider_reference text,
 order_id uuid references public.orders(id) on delete set null,
 event_type text not null,
 payment_status text not null check(payment_status in ('pending','paid','failed','cancelled','refunded','unknown')),
 signature_valid boolean not null default false,
 payload_hash text,
 created_at timestamptz not null default now(),
 unique(provider_code,provider_event_id)
);
alter table public.payment_events enable row level security;
revoke all on table public.payment_events from public,anon,authenticated;
grant select,insert,update on table public.payment_events to service_role;
create index if not exists payment_events_order_idx on public.payment_events(order_id,created_at desc);
