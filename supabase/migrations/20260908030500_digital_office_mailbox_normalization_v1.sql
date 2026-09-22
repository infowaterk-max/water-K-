-- Digital Office mailbox normalization guard.
-- Keeps routing deterministic and prevents case/whitespace aliases from bypassing mailbox uniqueness.

alter table public.office_mailboxes
  drop constraint if exists office_mailboxes_inbound_address_normalized_check;

alter table public.office_mailboxes
  add constraint office_mailboxes_inbound_address_normalized_check
  check (inbound_address=lower(trim(inbound_address)));

alter table public.office_mailboxes
  drop constraint if exists office_mailboxes_mailbox_key_normalized_check;

alter table public.office_mailboxes
  add constraint office_mailboxes_mailbox_key_normalized_check
  check (mailbox_key=lower(trim(mailbox_key)));
