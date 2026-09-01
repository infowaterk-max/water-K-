create table if not exists public.platform_operators(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_operators enable row level security;
revoke all on public.platform_operators from public,anon,authenticated;
grant select,insert,delete on public.platform_operators to service_role;
