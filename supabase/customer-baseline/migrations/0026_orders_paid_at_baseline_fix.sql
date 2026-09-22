-- Production pilot acceptance: restore the runtime column required by order/payment lifecycle code.
-- Production legacy baseline did not contain this field although lifecycle, payment-event
-- reconciliation and invoice processing already use it.

alter table public.orders
  add column if not exists paid_at timestamptz;

comment on column public.orders.paid_at
is 'Timestamp when payment is confirmed or an admin marks the order paid.';
