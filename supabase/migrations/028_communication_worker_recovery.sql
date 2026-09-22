-- V8: recover communication jobs abandoned by crashed workers.
create or replace function public.recover_stale_communication_jobs(p_stale_minutes integer default 15)
returns integer
language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update public.communication_jobs
  set status=case when attempts<5 then 'pending' else 'failed' end,
      scheduled_at=case when attempts<5 then now()+interval '5 minutes' else scheduled_at end,
      last_error=case when attempts<5 then 'STALE_WORKER_CLAIM_RECOVERED' else 'STALE_WORKER_CLAIM_MAX_ATTEMPTS' end,
      claim_token=null,
      claimed_at=null,
      updated_at=now()
  where status='processing'
    and claimed_at is not null
    and claimed_at < now()-make_interval(mins=>greatest(5,p_stale_minutes));
  get diagnostics v_count=row_count;
  return v_count;
end $$;

revoke all on function public.recover_stale_communication_jobs(integer) from public,anon,authenticated;
grant execute on function public.recover_stale_communication_jobs(integer) to service_role;
