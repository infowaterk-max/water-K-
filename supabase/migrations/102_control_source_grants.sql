-- V13 Supabase compatibility: make control-tower source reads explicit for service_role.
-- Newer Supabase projects do not guarantee automatic Data API/table grants for newly created public tables.
grant select on public.integration_jobs to service_role;
grant select on public.webhook_events to service_role;
grant select on public.support_tickets to service_role;
grant select on public.commercial_opportunities to service_role;
