-- Tenant-local payment identifiers and fail-closed webhook attribution.
-- Provider references/event ids may repeat across independently configured merchant accounts,
-- therefore uniqueness belongs to the webshop tenant boundary.

drop index if exists public.payment_attempts_provider_reference_uidx;
alter table public.payment_events drop constraint if exists payment_events_provider_code_provider_event_id_key;
drop index if exists public.payment_events_provider_code_provider_event_id_key;

create unique index if not exists payment_attempts_instance_provider_reference_uidx
  on public.payment_attempts(instance_id,provider_code,provider_reference)
  where provider_reference is not null;
create unique index if not exists payment_events_instance_provider_event_uidx
  on public.payment_events(instance_id,provider_code,provider_event_id);

create index if not exists payment_attempts_instance_provider_idx
  on public.payment_attempts(instance_id,provider_code,created_at desc);
create index if not exists payment_events_instance_provider_idx
  on public.payment_events(instance_id,provider_code,created_at desc);

comment on index public.payment_attempts_instance_provider_reference_uidx is 'Payment provider references are unique per webshop tenant.';
comment on index public.payment_events_instance_provider_event_uidx is 'Webhook event ids are unique per webshop tenant and provider.';
