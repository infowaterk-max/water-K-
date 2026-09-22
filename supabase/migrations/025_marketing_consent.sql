-- V8: explicit, auditable marketing consent. No consent is inferred from account or order creation.
create table if not exists public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  channel text not null default 'email' check (channel in ('email')),
  status text not null check (status in ('granted','withdrawn')),
  source text not null,
  policy_version text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists marketing_consents_email_occurred_idx on public.marketing_consents (lower(email), channel, occurred_at desc);
create index if not exists marketing_consents_user_occurred_idx on public.marketing_consents (user_id, occurred_at desc) where user_id is not null;

alter table public.marketing_consents enable row level security;
revoke all on table public.marketing_consents from anon, authenticated;
grant select, insert on table public.marketing_consents to service_role;

create or replace function public.has_marketing_consent(p_email text, p_channel text default 'email')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select mc.status = 'granted'
    from public.marketing_consents mc
    where lower(mc.email) = lower(trim(p_email)) and mc.channel = p_channel
    order by mc.occurred_at desc, mc.id desc
    limit 1
  ), false);
$$;

revoke all on function public.has_marketing_consent(text,text) from public, anon, authenticated;
grant execute on function public.has_marketing_consent(text,text) to service_role;
