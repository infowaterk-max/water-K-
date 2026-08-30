alter table public.profiles add column if not exists platform_operator boolean not null default false;
create index if not exists profiles_platform_operator_idx on public.profiles(platform_operator) where platform_operator=true;
