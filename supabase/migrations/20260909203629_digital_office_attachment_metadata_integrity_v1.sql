-- Digital Office attachment metadata integrity hardening.
-- Still metadata-only: no storage bucket, object policy, binary upload endpoint or mailbox activation.

alter table public.office_attachments
  drop constraint if exists office_attachments_storage_pair_check;
alter table public.office_attachments
  add constraint office_attachments_storage_pair_check
  check ((storage_bucket is null) = (storage_path is null));

alter table public.office_attachments
  drop constraint if exists office_attachments_ready_locator_check;
alter table public.office_attachments
  add constraint office_attachments_ready_locator_check
  check (
    status<>'ready'
    or (storage_bucket is not null and storage_path is not null)
    or nullif(trim(provider_attachment_id),'') is not null
  );

alter table public.office_attachments
  drop constraint if exists office_attachments_deleted_locator_check;
alter table public.office_attachments
  add constraint office_attachments_deleted_locator_check
  check (
    status<>'deleted'
    or (storage_bucket is null and storage_path is null and provider_attachment_id is null)
  );

comment on constraint office_attachments_storage_pair_check on public.office_attachments
is 'A private storage locator is either fully specified as bucket+path or absent.';
comment on constraint office_attachments_ready_locator_check on public.office_attachments
is 'Attachment metadata cannot claim ready state without a private storage locator or provider attachment id.';
comment on constraint office_attachments_deleted_locator_check on public.office_attachments
is 'Deleted attachment metadata must not retain a live storage/provider locator.';
