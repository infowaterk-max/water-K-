alter table public.checkout_recovery_intents add column if not exists communication_job_id uuid references public.communication_jobs(id) on delete set null;
create unique index if not exists checkout_recovery_intents_communication_job_uidx on public.checkout_recovery_intents(communication_job_id) where communication_job_id is not null;
create index if not exists checkout_recovery_intents_open_seen_idx on public.checkout_recovery_intents(status,last_seen_at) where status='open';

create or replace function public.queue_abandoned_checkout_recoveries(p_limit integer default 50,p_min_age_minutes integer default 60)
returns integer language plpgsql security definer set search_path='' as $$
declare r record;j uuid;n integer:=0;
begin
 for r in select i.id,i.user_id,i.email,i.recovery_token,i.cart from public.checkout_recovery_intents i where i.status='open' and i.expires_at>now() and i.communication_job_id is null and i.last_seen_at<=now()-make_interval(mins=>greatest(p_min_age_minutes,15)) order by i.last_seen_at asc for update of i skip locked limit greatest(1,least(p_limit,200)) loop
  if public.has_marketing_consent(r.email,'email') is not true then continue;end if;
  insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at) values(lower(trim(r.email)),r.user_id,'marketing','abandoned_checkout',jsonb_build_object('recoveryUrl','/kosar/visszaallitas?token='||r.recovery_token::text,'itemCount',jsonb_array_length(r.cart),'recoveryIntentId',r.id),'checkout-recovery:'||r.id::text,false,now()) on conflict(idempotency_key) do update set updated_at=now() returning id into j;
  update public.checkout_recovery_intents set communication_job_id=j,updated_at=now() where id=r.id;n:=n+1;
 end loop;return n;
end;$$;
revoke execute on function public.queue_abandoned_checkout_recoveries(integer,integer) from public,anon,authenticated;
grant execute on function public.queue_abandoned_checkout_recoveries(integer,integer) to service_role;
