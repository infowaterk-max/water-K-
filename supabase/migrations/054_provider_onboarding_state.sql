alter table public.webshop_instance_provider_connections
  add column if not exists onboarding_step text not null default 'selection',
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_test_message text,
  add column if not exists credential_fields_present text[] not null default '{}';

alter table public.webshop_instance_provider_connections
  drop constraint if exists webshop_instance_provider_connections_onboarding_step_check;

alter table public.webshop_instance_provider_connections
  add constraint webshop_instance_provider_connections_onboarding_step_check
  check (onboarding_step in ('selection','contract','credentials','verification','ready'));

comment on column public.webshop_instance_provider_connections.credential_fields_present is
  'Only non-secret credential field names. Secret values must remain in server-side environment/secret storage.';
