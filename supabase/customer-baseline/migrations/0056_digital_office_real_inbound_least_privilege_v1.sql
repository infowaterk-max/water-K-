-- Core #1186 U10A2-F9: canonical service_role least-privilege inbound mailbox/routing.
-- Canonical source: supabase/migrations/20260908031000_digital_office_real_inbound_least_privilege_v1.sql
-- Canonical SHA256: 9c70531d4c9b7e9f052c77b478e9f96830ed9ef83ecc69805a47c276772ca6f6
-- Requires 0054 real inbound foundation and 0055 mailbox normalization.
-- Source-only proof is NOT PostgreSQL effective GRANT/RLS validation or a true Fresh Install.
-- Later composer, Communication Hub Advanced and U10A1 strict Pro Office dependencies remain BLOCKED.
-- CANONICAL SOURCE BODY BELOW; NEVER EDIT WITHOUT RECONCILING THE SOURCE.
-- Digital Office real inbound least-privilege hardening.
-- Service runtime only needs CRUD on mailbox/routing metadata; DDL-like table privileges stay revoked.

revoke all on table public.office_mailboxes from service_role;
grant select,insert,update,delete on table public.office_mailboxes to service_role;

revoke all on table public.office_thread_email_routes from service_role;
grant select,insert,update,delete on table public.office_thread_email_routes to service_role;

-- Cover the composite FK in the same column order used by FK checks/deletes.
create index if not exists office_thread_email_routes_thread_instance_idx
  on public.office_thread_email_routes(thread_id,instance_id);
