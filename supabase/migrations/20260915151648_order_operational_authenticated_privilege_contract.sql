-- Explicit least-privilege browser grants for RLS-governed order operations.
-- The authenticated role still sees or updates rows only through the existing tenant-aware RLS policies.
grant select, update on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_events to authenticated;
grant select on table public.integration_jobs to authenticated;
grant select on table public.payment_attempts to authenticated;
