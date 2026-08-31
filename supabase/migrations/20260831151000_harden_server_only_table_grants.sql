-- Harden tables that intentionally have RLS enabled without browser policies.
-- These tables are server/service-role managed; direct browser grants are unnecessary
-- and weaken the explicit server-only boundary even though RLS currently denies rows.
revoke all privileges on table public.communication_job_events from anon, authenticated;
revoke all privileges on table public.inventory_snapshots from anon, authenticated;
revoke all privileges on table public.purchase_order_items from anon, authenticated;
revoke all privileges on table public.purchase_orders from anon, authenticated;
revoke all privileges on table public.suppliers from anon, authenticated;
