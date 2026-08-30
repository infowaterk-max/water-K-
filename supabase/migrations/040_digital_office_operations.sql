alter table public.office_threads add column if not exists priority text not null default 'normal' check(priority in ('low','normal','high','urgent')), add column if not exists assigned_to uuid references auth.users(id) on delete set null, add column if not exists last_read_at timestamptz;
create index if not exists office_threads_assigned_idx on public.office_threads(assigned_to,status,updated_at desc);
create index if not exists office_threads_priority_idx on public.office_threads(priority,status,updated_at desc);
create index if not exists office_tasks_assigned_idx on public.office_tasks(assigned_to,status,due_at);
create index if not exists office_threads_order_id_idx on public.office_threads(order_id);
create index if not exists office_messages_author_id_idx on public.office_messages(author_id);
create index if not exists office_tasks_created_by_idx on public.office_tasks(created_by);
