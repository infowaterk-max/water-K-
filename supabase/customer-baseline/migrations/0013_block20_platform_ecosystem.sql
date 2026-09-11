-- Roadmap Block 20 – Platform Ecosystem & Enterprise Extensibility.
-- Tenant installations, revocable API credentials and outbound webhook evidence only.
-- This migration does not create a second commerce/business-state authority.

update public.entitlement_capabilities
set release_state='released', updated_at=now()
where capability_code='apiAccess';

insert into public.plan_capability_grants(plan_code,capability_code)
values ('pro','apiAccess')
on conflict do nothing;

do $$
declare r record;
begin
  for r in select id from public.webshop_instances where subscription_plan='pro' loop
    perform private.sync_webshop_plan_entitlements(r.id);
  end loop;
end $$;

create table if not exists public.extension_app_catalog(
  app_key text primary key check(app_key ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
  display_name text not null check(length(trim(display_name)) between 1 and 120),
  version text not null check(length(trim(version)) between 1 and 40),
  release_state text not null default 'draft' check(release_state in ('draft','released','suspended')),
  allowed_scopes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extension_installations(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  app_key text not null references public.extension_app_catalog(app_key) on delete restrict,
  status text not null default 'disabled' check(status in ('enabled','disabled','revoked')),
  configuration jsonb not null default '{}'::jsonb,
  installed_by uuid null references auth.users(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,app_key),
  unique(instance_id,id)
);

create table if not exists public.extension_api_credentials(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  installation_id uuid not null,
  key_prefix text not null unique check(key_prefix ~ '^[A-Za-z0-9_-]{8,32}$'),
  secret_hash text not null unique check(secret_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz null,
  revoked_at timestamptz null,
  last_used_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint extension_api_credentials_installation_tenant_fk
    foreign key(instance_id,installation_id)
    references public.extension_installations(instance_id,id)
    on delete cascade
);

create table if not exists public.extension_webhook_subscriptions(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  installation_id uuid not null,
  event_type text not null check(length(event_type) between 3 and 120),
  endpoint_url text not null check(length(endpoint_url) between 8 and 2048),
  enabled boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(installation_id,event_type,endpoint_url),
  unique(instance_id,id),
  constraint extension_webhook_subscriptions_installation_tenant_fk
    foreign key(instance_id,installation_id)
    references public.extension_installations(instance_id,id)
    on delete cascade
);

create table if not exists public.extension_webhook_deliveries(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  subscription_id uuid not null,
  event_type text not null,
  event_key text not null check(length(event_key) between 3 and 240),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','processing','retry','delivered','dead_letter')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 20),
  next_attempt_at timestamptz null,
  response_status integer null check(response_status is null or response_status between 100 and 599),
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz null,
  unique(subscription_id,event_key),
  constraint extension_webhook_deliveries_subscription_tenant_fk
    foreign key(instance_id,subscription_id)
    references public.extension_webhook_subscriptions(instance_id,id)
    on delete cascade
);

create index if not exists extension_installations_instance_status_idx on public.extension_installations(instance_id,status);
create index if not exists extension_api_credentials_instance_installation_idx on public.extension_api_credentials(instance_id,installation_id);
create index if not exists extension_webhook_subscriptions_instance_event_idx on public.extension_webhook_subscriptions(instance_id,event_type) where enabled;
create index if not exists extension_webhook_deliveries_due_idx on public.extension_webhook_deliveries(status,next_attempt_at,created_at) where status in ('pending','retry','processing');

alter table public.extension_app_catalog enable row level security;
alter table public.extension_installations enable row level security;
alter table public.extension_api_credentials enable row level security;
alter table public.extension_webhook_subscriptions enable row level security;
alter table public.extension_webhook_deliveries enable row level security;

revoke all on public.extension_app_catalog from public,anon,authenticated;
revoke all on public.extension_installations from public,anon,authenticated;
revoke all on public.extension_api_credentials from public,anon,authenticated;
revoke all on public.extension_webhook_subscriptions from public,anon,authenticated;
revoke all on public.extension_webhook_deliveries from public,anon,authenticated;

grant select,insert,update,delete on public.extension_app_catalog to service_role;
grant select,insert,update,delete on public.extension_installations to service_role;
grant select,insert,update,delete on public.extension_api_credentials to service_role;
grant select,insert,update,delete on public.extension_webhook_subscriptions to service_role;
grant select,insert,update,delete on public.extension_webhook_deliveries to service_role;

comment on table public.extension_app_catalog is 'Block 20 platform-controlled extension metadata; never a business-state authority.';
comment on table public.extension_api_credentials is 'Block 20 credential hashes only; plaintext API secrets are never persisted.';
comment on table public.extension_webhook_deliveries is 'Block 20 idempotent outbound webhook delivery evidence processed by the existing integrations cron.';
