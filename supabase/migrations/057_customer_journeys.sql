-- V9 idempotent customer journey enrollment and steps.

do $$ begin
  create type public.customer_journey_kind as enum ('post_purchase','replenishment','winback','abandoned_checkout');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_journey_status as enum ('active','completed','cancelled','blocked');
exception when duplicate_object then null; end $$;

create table if not exists public.customer_journeys(
  id uuid primary key default gen_random_uuid(),
  kind public.customer_journey_kind not null,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  source_key text not null,
  status public.customer_journey_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(kind,source_key)
);

create table if not exists public.customer_journey_steps(
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.customer_journeys(id) on delete cascade,
  step_key text not null,
  purpose text not null check(purpose in ('transactional','marketing')),
  template_key text not null,
  scheduled_at timestamptz not null,
  communication_job_id uuid references public.communication_jobs(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','queued','blocked','cancelled')),
  created_at timestamptz not null default now(),
  unique(journey_id,step_key)
);

create index if not exists customer_journeys_status_idx on public.customer_journeys(status,created_at);
create index if not exists customer_journey_steps_schedule_idx on public.customer_journey_steps(status,scheduled_at);

alter table public.customer_journeys enable row level security;
alter table public.customer_journey_steps enable row level security;
revoke all on public.customer_journeys,public.customer_journey_steps from anon,authenticated;
grant select,insert,update on public.customer_journeys,public.customer_journey_steps to service_role;

create or replace function public.create_customer_journey(
  p_kind public.customer_journey_kind,
  p_user_id uuid,
  p_email text,
  p_source_key text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;begin
  if length(trim(p_email))<5 or length(trim(p_source_key))<3 then raise exception 'invalid journey identity'; end if;
  insert into public.customer_journeys(kind,user_id,email,source_key,metadata)
  values(p_kind,p_user_id,lower(trim(p_email)),trim(p_source_key),coalesce(p_metadata,'{}'::jsonb))
  on conflict(kind,source_key) do update set updated_at=now()
  returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.create_customer_journey(public.customer_journey_kind,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_customer_journey(public.customer_journey_kind,uuid,text,text,jsonb) to service_role;

comment on table public.customer_journeys is 'V9 idempotent retention/recovery journey enrollments.';
