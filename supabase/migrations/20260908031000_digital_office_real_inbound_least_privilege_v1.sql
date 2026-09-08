-- Digital Office real inbound least-privilege hardening.
-- Service runtime only needs CRUD on mailbox/routing metadata; DDL-like table privileges stay revoked.

revoke all on table public.office_mailboxes from service_role;
grant select,insert,update,delete on table public.office_mailboxes to service_role;

revoke all on table public.office_thread_email_routes from service_role;
grant select,insert,update,delete on table public.office_thread_email_routes to service_role;

-- Cover the composite FK in the same column order used by FK checks/deletes.
create index if not exists office_thread_email_routes_thread_instance_idx
  on public.office_thread_email_routes(thread_id,instance_id);
