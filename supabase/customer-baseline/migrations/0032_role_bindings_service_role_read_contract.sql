-- Current-store resolution reads authoritative RBAC bindings through the server-side service-role client.
-- Keep this privilege explicit in Fresh Install environments.
grant select on table public.role_bindings to service_role;
