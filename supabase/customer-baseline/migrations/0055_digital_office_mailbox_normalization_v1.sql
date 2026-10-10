-- Core #1186 U10A2-F8: canonical inbound mailbox normalization.
-- Canonical source: supabase/migrations/20260908030500_digital_office_mailbox_normalization_v1.sql
-- Canonical SHA256: 66dfa2b0f55208aab7a2d1055c2435e92589d7d056122d6a9b3c0ab304be9dea
-- Requires 0054 real inbound mailbox foundation.
-- Existing invalid rows on occupied databases require preflight; no target DDL or row changes performed here.
-- Fresh Install source proof only; 0056 least privilege and full Advanced Office Pro SQL still BLOCKED.
-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.
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
