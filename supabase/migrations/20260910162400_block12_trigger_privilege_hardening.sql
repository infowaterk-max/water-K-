-- Roadmap Block 12 security hardening: trigger helpers are internal-only.
-- PostgreSQL triggers keep invoking their function after EXECUTE is revoked from API roles.

revoke all on function public.migration_run_tenant_guard_v1() from public,anon,authenticated;
revoke all on function public.migration_child_tenant_guard_v1() from public,anon,authenticated;
revoke all on function public.migration_external_link_tenant_guard_v1() from public,anon,authenticated;
