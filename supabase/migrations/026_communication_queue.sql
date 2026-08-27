-- V8: auditable communication queue with idempotency and explicit purpose separation.
create table if not exists public.communication_jobs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null check (purpose in ('transactional','marketing')),
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','blocked','cancelled')),
  idempotency_key text not null unique,
  scheduled_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists communication_jobs_status_schedule_idx on public.communication_jobs(status,scheduled_at);
create index if not exists communication_jobs_recipient_idx on public.communication_jobs(lower(recipient_email),created_at desc);
alter table public.communication_jobs enable row level security;
revoke all on table public.communication_jobs from anon, authenticated;
grant select,insert,update on table public.communication_jobs to service_role;

create or replace function public.enqueue_communication(p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now())
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_purpose not in ('transactional','marketing') then raise exception 'invalid purpose'; end if;
  if p_purpose='marketing' and not public.has_marketing_consent(p_email,'email') then raise exception 'marketing consent required'; end if;
  insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at)
  values(lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at)
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.enqueue_communication(text,uuid,text,text,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_communication(text,uuid,text,text,jsonb,text,timestamptz) to service_role;
