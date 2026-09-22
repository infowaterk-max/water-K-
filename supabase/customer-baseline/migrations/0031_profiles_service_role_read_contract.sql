-- Fresh installs must preserve the same server-side profile read contract as production.

grant select on table public.profiles to service_role;
