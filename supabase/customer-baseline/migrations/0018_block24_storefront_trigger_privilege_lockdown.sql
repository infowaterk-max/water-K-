-- Roadmap Block 24 security gate: storefront trigger helpers are internal-only.
-- These SECURITY DEFINER functions are invoked only by their owning triggers.
-- Direct Data API/service invocation is never part of the storefront authority.

revoke all on function public.storefront_revisions_immutable() from public,anon,authenticated,service_role;
revoke all on function public.storefront_events_immutable() from public,anon,authenticated,service_role;
revoke all on function public.storefront_preview_session_guard() from public,anon,authenticated,service_role;
