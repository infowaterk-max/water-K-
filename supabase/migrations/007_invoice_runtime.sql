alter table public.orders add column if not exists invoice_number text;
alter table public.orders add column if not exists invoice_url text;
alter table public.orders add column if not exists invoiced_at timestamptz;
create index if not exists orders_invoice_number_idx on public.orders(invoice_number) where invoice_number is not null;
