-- Core #1186 U10A2-F12: direct tenant FK for Office threadless drafts.
-- Canonical source: supabase/migrations/20260908034600_digital_office_drafts_tenant_integrity_v1.sql
-- Canonical SHA256: 9ceae0c48d5e5af37aaf3a48a992b01753e10240758686f8f9b1d6c1faac6c6f
-- Requires 0057 Composer/Drafts and 0058 reply queue INSERT guard.
-- Known security blocker: 0058 canonical queue trigger does not validate UPDATE; separate forward-only repair required.
-- No target database migration, real effective grants/RLS or Pro subscription proof.
-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.
-- Digital Office draft tenant integrity hardening.
-- New-email drafts can exist without a thread, therefore instance ownership must be enforced directly as well.

alter table public.office_drafts
  drop constraint if exists office_drafts_instance_id_fkey;
alter table public.office_drafts
  add constraint office_drafts_instance_id_fkey
  foreign key(instance_id) references public.webshop_instances(id) on delete cascade;

create index if not exists office_drafts_author_instance_idx
  on public.office_drafts(author_user_id,instance_id);
