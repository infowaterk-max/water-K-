-- Keep payment attempts server-only and constrain their lifecycle values.
revoke all on table public.payment_attempts from anon, authenticated;
grant select, insert, update, delete on table public.payment_attempts to service_role;
alter table public.payment_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.payment_attempts'::regclass
      and conname='payment_attempts_status_check'
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_status_check
      check (status in ('created','pending','requires_action','succeeded','failed','cancelled','expired','refunded'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.payment_attempts'::regclass
      and pg_get_constraintdef(oid) ilike '%amount_huf >= 0%'
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_amount_check check (amount_huf >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.payment_attempts'::regclass
      and pg_get_constraintdef(oid) ilike '%currency%HUF%'
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_currency_check check (currency='HUF');
  end if;
end $$;
