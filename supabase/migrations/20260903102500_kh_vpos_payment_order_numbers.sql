-- K&H vPOS eAPI requires a numeric merchant orderNo with at most 10 digits.
-- Allocate it server-side per payment attempt so retries never reuse an ambiguous provider order number.

alter table public.payment_attempts
  add column if not exists provider_order_no text;

create unique index if not exists payment_attempts_provider_order_no_uidx
  on public.payment_attempts(provider_code,provider_order_no)
  where provider_order_no is not null;

create sequence if not exists private.kh_vpos_order_no_seq
  as bigint
  start with 1000000001
  increment by 1
  minvalue 1000000001
  maxvalue 9999999999
  no cycle;

revoke all on sequence private.kh_vpos_order_no_seq
from public,anon,authenticated,service_role;

create or replace function public.allocate_payment_provider_order_no_v1(
  p_attempt_id uuid,
  p_provider_code text
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  v_provider_code text;
  v_existing text;
  v_order_no bigint;
begin
  select pa.provider_code,pa.provider_order_no
    into v_provider_code,v_existing
  from public.payment_attempts pa
  where pa.id=p_attempt_id
  for update;

  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND';
  end if;
  if v_provider_code<>p_provider_code then
    raise exception 'PAYMENT_PROVIDER_MISMATCH';
  end if;
  if v_existing is not null then
    return v_existing;
  end if;
  if p_provider_code<>'kh_card' then
    raise exception 'PAYMENT_PROVIDER_ORDER_NO_NOT_SUPPORTED';
  end if;

  v_order_no:=nextval('private.kh_vpos_order_no_seq'::regclass);
  if v_order_no<1000000001 or v_order_no>9999999999 then
    raise exception 'KH_VPOS_ORDER_NO_EXHAUSTED';
  end if;

  update public.payment_attempts
  set provider_order_no=v_order_no::text,updated_at=now()
  where id=p_attempt_id and provider_order_no is null;

  return v_order_no::text;
end;
$$;

revoke all on function public.allocate_payment_provider_order_no_v1(uuid,text)
from public,anon,authenticated;
grant execute on function public.allocate_payment_provider_order_no_v1(uuid,text)
to service_role;

comment on function public.allocate_payment_provider_order_no_v1(uuid,text) is
  'Allocates an idempotent 10-digit numeric K&H vPOS eAPI orderNo for one payment attempt.';
