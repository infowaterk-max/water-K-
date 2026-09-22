-- V8: concurrency-safe communication worker claims and retry scheduling.
alter table public.communication_jobs add column if not exists claim_token uuid;
alter table public.communication_jobs add column if not exists claimed_at timestamptz;

create or replace function public.claim_communication_jobs(p_limit integer default 10)
returns setof public.communication_jobs
language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select id from public.communication_jobs
    where status='pending' and scheduled_at<=now()
    order by scheduled_at,created_at
    for update skip locked
    limit greatest(1,least(p_limit,50))
  ), claimed as (
    update public.communication_jobs j
    set status='processing',claim_token=gen_random_uuid(),claimed_at=now(),attempts=j.attempts+1,updated_at=now()
    from candidates c where j.id=c.id
    returning j.*
  ) select * from claimed;
end $$;

create or replace function public.complete_communication_job(p_id uuid,p_claim_token uuid,p_provider_message_id text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.communication_jobs set status='sent',provider_message_id=p_provider_message_id,sent_at=now(),claim_token=null,claimed_at=null,last_error=null,updated_at=now()
 where id=p_id and status='processing' and claim_token=p_claim_token;
 return found;
end $$;

create or replace function public.fail_communication_job(p_id uuid,p_claim_token uuid,p_error text,p_retry boolean default true)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.communication_jobs set status=case when p_retry and attempts<5 then 'pending' else 'failed' end,last_error=left(p_error,2000),scheduled_at=case when p_retry and attempts<5 then now()+make_interval(mins=>least(60,attempts*5)) else scheduled_at end,claim_token=null,claimed_at=null,updated_at=now()
 where id=p_id and status='processing' and claim_token=p_claim_token;
 return found;
end $$;

revoke all on function public.claim_communication_jobs(integer) from public,anon,authenticated;
revoke all on function public.complete_communication_job(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.fail_communication_job(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_communication_jobs(integer) to service_role;
grant execute on function public.complete_communication_job(uuid,uuid,text) to service_role;
grant execute on function public.fail_communication_job(uuid,uuid,text,boolean) to service_role;
