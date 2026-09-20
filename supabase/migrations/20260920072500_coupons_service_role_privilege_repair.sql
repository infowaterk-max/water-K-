-- Restore least-privilege server-side coupon access.
-- The coupon table was revoked from browser roles in the legacy coupon engine,
-- but server-side admin/checkout code uses the service-role client for tenant-scoped reads/writes.
-- RLS remains enabled; browser roles are not widened by this repair.

revoke all on table public.coupons from service_role;
grant select,insert,update,delete on table public.coupons to service_role;

comment on table public.coupons is
  'Tenant-scoped coupon authority. Browser access remains RLS-controlled; service_role has CRUD for server-side admin, quote, and acceptance fixture paths.';
