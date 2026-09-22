create table if not exists public.webshop_instances(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subscription_plan text not null default 'pro' check(subscription_plan in ('alap','pro')),
  status text not null default 'pilot' check(status in ('pilot','active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.webshop_instance_members(
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'admin' check(role in ('owner','admin','staff')),
  created_at timestamptz not null default now(),
  primary key(instance_id,user_id)
);
create table if not exists public.webshop_instance_addons(
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  addon_code text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,addon_code)
);
create index if not exists webshop_instance_members_user_idx on public.webshop_instance_members(user_id);
create index if not exists webshop_instances_status_idx on public.webshop_instances(status);
alter table public.webshop_instances enable row level security;
alter table public.webshop_instance_members enable row level security;
alter table public.webshop_instance_addons enable row level security;
revoke all on public.webshop_instances,public.webshop_instance_members,public.webshop_instance_addons from public,anon,authenticated;
grant select,insert,update,delete on public.webshop_instances,public.webshop_instance_members,public.webshop_instance_addons to service_role;
