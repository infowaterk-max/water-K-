-- Roadmap Block 9 — FK maintenance indexes.
-- Covers the new auth/delegation foreign keys for referenced-row maintenance.
-- No feature, mailbox, storage or tenant state is activated here.

create index if not exists office_mailboxes_responsible_user_fk_idx
  on public.office_mailboxes(responsible_user_id);

create index if not exists office_threads_customer_user_fk_idx
  on public.office_threads(customer_user_id);

create index if not exists office_threads_sales_owner_user_fk_idx
  on public.office_threads(sales_owner_user_id);

create index if not exists office_messages_acting_for_user_fk_idx
  on public.office_messages(acting_for_user_id);

create index if not exists office_messages_delegation_fk_idx
  on public.office_messages(delegation_id);
