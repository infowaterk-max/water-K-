-- V9 authenticated checkout recovery foundation.
create table if not exists public.checkout_recovery_intents(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  cart jsonb not null,
  checkout jsonb not null default '{}'::jsonb,
  recovery_token uuid not null default gen_random_uuid() unique,
  status text not null default 'open' check(status in ('open','converted','expired','cancelled')),
  expires_at timestamptz not null default now()+interval '7 days',
  converted_order_id uuid references public.orders(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists checkout_recovery_open_user_uq on public.checkout_recovery_intents(user_id) where status='open';
create index if not exists checkout_recovery_status_expiry_idx on public.checkout_recovery_intents(status,expires_at);
alter table public.checkout_recovery_intents enable row level security;
revoke all on public.checkout_recovery_intents from anon,authenticated;
grant select,insert,update on public.checkout_recovery_intents to service_role;

create or replace function public.upsert_checkout_recovery_intent(p_user_id uuid,p_email text,p_cart jsonb,p_checkout jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r public.checkout_recovery_intents%rowtype;begin
  if p_user_id is null or length(trim(p_email))<5 then raise exception 'invalid recovery identity'; end if;
  if p_cart is null or jsonb_typeof(p_cart)<>'array' or jsonb_array_length(p_cart)=0 then raise exception 'empty cart'; end if;
  select * into r from public.checkout_recovery_intents where user_id=p_user_id and status='open' for update;
  if found then
    update public.checkout_recovery_intents set email=lower(trim(p_email)),cart=p_cart,checkout=coalesce(p_checkout,'{}'::jsonb),expires_at=now()+interval '7 days',last_seen_at=now(),updated_at=now() where id=r.id returning * into r;
  else
    insert into public.checkout_recovery_intents(user_id,email,cart,checkout) values(p_user_id,lower(trim(p_email)),p_cart,coalesce(p_checkout,'{}'::jsonb)) returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'token',r.recovery_token,'expiresAt',r.expires_at);
end;$$;
revoke all on function public.upsert_checkout_recovery_intent(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_checkout_recovery_intent(uuid,text,jsonb,jsonb) to service_role;

create or replace function public.convert_checkout_recovery_intent(p_user_id uuid,p_order_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  update public.checkout_recovery_intents set status='converted',converted_order_id=p_order_id,updated_at=now() where user_id=p_user_id and status='open';
  return found;
end;$$;
revoke all on function public.convert_checkout_recovery_intent(uuid,uuid) from public,anon,authenticated;
grant execute on function public.convert_checkout_recovery_intent(uuid,uuid) to service_role;
