alter type public.order_status add value if not exists 'pending_payment';
alter type public.order_status add value if not exists 'pending_transfer';

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_code text not null,
  provider_reference text,
  status text not null default 'created' check (status in ('created','pending','requires_action','succeeded','failed','cancelled','expired','refunded')),
  amount_huf integer not null check (amount_huf >= 0),
  currency text not null default 'HUF',
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists payment_attempts_provider_reference_uidx
  on public.payment_attempts(provider_code, provider_reference)
  where provider_reference is not null;

create index if not exists payment_attempts_order_created_idx
  on public.payment_attempts(order_id, created_at desc);

alter table public.payment_attempts enable row level security;

comment on table public.payment_attempts is 'Provider-neutral online payment attempts. Failed or cancelled attempts do not cancel the order; a customer may retry payment.';
