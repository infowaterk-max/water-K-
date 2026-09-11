-- Roadmap Block 24 – Commercial / Security / Maturity Gate
-- Close direct RPC execution of storefront trigger guards. These functions are
-- trigger-only integrity boundaries; no client or service caller needs EXECUTE.
-- Trigger invocation remains owned by PostgreSQL and is unaffected by revoking
-- direct function execution privileges.

revoke all on function public.storefront_revisions_immutable() from public, anon, authenticated, service_role;
revoke all on function public.storefront_events_immutable() from public, anon, authenticated, service_role;
revoke all on function public.storefront_preview_session_guard() from public, anon, authenticated, service_role;
