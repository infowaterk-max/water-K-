create index if not exists inventory_events_actor_user_id_idx on public.inventory_events(actor_user_id);
create index if not exists inventory_events_order_id_idx on public.inventory_events(order_id);
create index if not exists order_events_actor_user_id_idx on public.order_events(actor_user_id);

drop policy if exists "users can read permitted order events" on public.order_events;
create policy "users can read permitted order events"
on public.order_events
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.orders o
    where o.id = order_events.order_id
      and o.customer_id = (select auth.uid())
  )
);
