-- Restore authenticated customer self-read for returns after strict tenant RLS.
-- Store/admin policies remain authoritative for merchant operations.
drop policy if exists return_cases_customer_read on public.return_cases;
create policy return_cases_customer_read on public.return_cases
for select to authenticated
using (
  user_id=(select auth.uid())
  and exists(
    select 1 from public.orders o
    where o.id=return_cases.order_id
      and o.instance_id=return_cases.instance_id
      and o.customer_id=(select auth.uid())
  )
);

drop policy if exists return_case_items_customer_read on public.return_case_items;
create policy return_case_items_customer_read on public.return_case_items
for select to authenticated
using (
  exists(
    select 1 from public.return_cases r
    where r.id=return_case_items.return_case_id
      and r.instance_id=return_case_items.instance_id
      and r.user_id=(select auth.uid())
  )
);


-- RLS policies do not grant table privileges by themselves. The strict
-- operational hardening revoked the authenticated table privilege, so the
-- customer self-read path must explicitly restore SELECT while RLS continues
-- to restrict rows to the owning customer.
grant select on table public.return_cases to authenticated;
grant select on table public.return_case_items to authenticated;
