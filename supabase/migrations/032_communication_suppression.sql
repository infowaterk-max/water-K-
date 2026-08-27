-- V8: global recipient suppression for hard bounces, complaints and manual blocks.
create table if not exists public.communication_suppressions(
 id uuid primary key default gen_random_uuid(),
 email text not null,
 reason text not null check(reason in('hard_bounce','complaint','manual','invalid')),
 source text not null,
 provider_event_id text,
 note text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 released_at timestamptz,
 released_by uuid references auth.users(id) on delete set null
);
create index if not exists communication_suppressions_email_idx on public.communication_suppressions(lower(email),active);
create unique index if not exists communication_suppressions_provider_event_uidx on public.communication_suppressions(provider_event_id) where provider_event_id is not null;
alter table public.communication_suppressions enable row level security;
revoke all on table public.communication_suppressions from anon,authenticated;
grant select,insert,update on table public.communication_suppressions to service_role;

create or replace function public.is_communication_suppressed(p_email text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.communication_suppressions where lower(email)=lower(trim(p_email)) and active=true);
$$;
revoke all on function public.is_communication_suppressed(text) from public,anon,authenticated;
grant execute on function public.is_communication_suppressed(text) to service_role;

create or replace function public.enqueue_communication(p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now())
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_purpose not in('transactional','marketing') then raise exception 'invalid purpose';end if;
 if public.is_communication_suppressed(p_email) then raise exception 'recipient suppressed';end if;
 if p_purpose='marketing' and not public.has_marketing_consent(p_email,'email') then raise exception 'marketing consent required';end if;
 insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at)
 values(lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at)
 on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_id;return v_id;
end $$;
