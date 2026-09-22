-- Restore server-side read authority for the operational return queue.
-- Customer self-read remains RLS-scoped; merchant mutations remain RPC-driven.
grant select on table public.return_cases to service_role;
grant select on table public.return_case_items to service_role;
