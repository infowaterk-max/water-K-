-- Keep server-side platform administration readable through the Supabase Data API.
-- Platform pages use the service role for tenant-safe profile metadata lookups.

grant select on table public.profiles to service_role;
