create table if not exists public.office_user_presence (
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key(instance_id,user_id)
);

create index if not exists office_user_presence_last_seen_idx
  on public.office_user_presence(instance_id,last_seen_at desc);

alter table public.office_user_presence enable row level security;
revoke all on table public.office_user_presence from public,anon,authenticated;
grant select,insert,update,delete on table public.office_user_presence to service_role;

comment on table public.office_user_presence is
  'Service-only Team Chat heartbeat state. Contains no message content and is used only for coarse online/offline presence.';
