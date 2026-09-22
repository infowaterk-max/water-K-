-- Customer account browser grants.
-- RLS policies already restrict these tables to the authenticated owner.
-- This migration restores the minimum table privileges required for those policies
-- to be reachable from the customer session.

grant select on table public.profiles to authenticated;
revoke update on table public.profiles from authenticated;
grant update(full_name,company_name,tax_number) on table public.profiles to authenticated;

grant select on table public.wishlists to authenticated;

-- Keep anonymous access closed.
revoke all on table public.profiles from anon;
revoke all on table public.wishlists from anon;
