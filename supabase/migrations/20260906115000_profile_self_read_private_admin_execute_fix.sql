-- Block 3 production-pilot acceptance: restore authenticated execution of the
-- SECURITY DEFINER helper referenced by authenticated RLS policies.
--
-- The helper itself only returns whether the current authenticated user is an
-- admin/platform operator. Anonymous/public callers stay blocked.

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
