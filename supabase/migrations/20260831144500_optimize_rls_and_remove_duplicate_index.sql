-- Optimize auth.uid() evaluation in user-facing RLS policies without changing authorization semantics.
alter policy "users can read own return cases" on public.return_cases
  using ((select auth.uid()) = user_id);

alter policy "users can create own return cases" on public.return_cases
  with check (((select auth.uid()) = user_id) and exists (
    select 1 from public.orders o
    where o.id = return_cases.order_id and o.customer_id = (select auth.uid())
  ));

alter policy "users can read own return items" on public.return_case_items
  using (exists (
    select 1 from public.return_cases r
    where r.id = return_case_items.return_case_id and r.user_id = (select auth.uid())
  ));

alter policy "users can read own support tickets" on public.support_tickets
  using ((select auth.uid()) = user_id);

alter policy "users can read own support messages" on public.support_ticket_messages
  using (exists (
    select 1 from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id and t.user_id = (select auth.uid())
  ));

alter policy "users can add own support messages" on public.support_ticket_messages
  with check (
    author_role = 'customer'::text
    and author_user_id = (select auth.uid())
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.user_id = (select auth.uid())
        and t.status <> 'closed'::public.support_ticket_status
    )
  );

alter policy "admins manage office threads" on public.office_threads
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role));

alter policy "admins manage office messages" on public.office_messages
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role));

alter policy "admins manage office tasks" on public.office_tasks
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.customer_role));

-- event_key already has a UNIQUE constraint-backed index; keep that canonical index.
drop index if exists public.post_release_reconcile_event_unique;
