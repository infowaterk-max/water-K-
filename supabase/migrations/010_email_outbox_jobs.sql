alter table public.integration_jobs drop constraint if exists integration_jobs_kind_check;
alter table public.integration_jobs add constraint integration_jobs_kind_check check (kind in ('payment_create','payment_callback','shipment_create','invoice_create','email_send'));
