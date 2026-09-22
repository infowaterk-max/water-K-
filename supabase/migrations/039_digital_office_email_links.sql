alter table public.office_messages add column if not exists communication_job_id uuid references public.communication_jobs(id) on delete set null;
alter table public.office_messages add column if not exists external_message_id text;
alter table public.office_messages add column if not exists sender_email text;
alter table public.office_messages add column if not exists recipient_email text;
alter table public.office_messages add column if not exists subject text;
create unique index if not exists office_messages_communication_job_uidx on public.office_messages(communication_job_id) where communication_job_id is not null;
create unique index if not exists office_messages_external_message_uidx on public.office_messages(external_message_id) where external_message_id is not null;
create index if not exists office_messages_sender_idx on public.office_messages(lower(sender_email)) where sender_email is not null;
