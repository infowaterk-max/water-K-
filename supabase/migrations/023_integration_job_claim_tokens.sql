alter table public.integration_jobs
  add column if not exists processing_token uuid;

create or replace function public.claim_integration_jobs(p_limit integer default 10)
returns table(id uuid, processing_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with picked as (
    select j.id
    from public.integration_jobs j
    where (
      j.status = 'pending'
      or (j.status = 'failed' and j.next_attempt_at is not null and j.next_attempt_at <= now())
      or (j.status = 'processing' and j.updated_at <= now() - interval '15 minutes')
    )
    order by j.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10), 50))
  ), claimed as (
    update public.integration_jobs j
    set status='processing', processing_token=gen_random_uuid(), updated_at=now()
    from picked
    where j.id=picked.id
    returning j.id, j.processing_token
  )
  select claimed.id, claimed.processing_token from claimed;
end;
$$;

create or replace function public.claim_integration_job(p_id uuid)
returns table(id uuid, processing_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.integration_jobs j
  set status='processing', processing_token=gen_random_uuid(), updated_at=now(), next_attempt_at=null
  where j.id=p_id
    and (
      j.status in ('pending','failed','blocked')
      or (j.status='processing' and j.updated_at <= now() - interval '15 minutes')
    )
  returning j.id, j.processing_token;
end;
$$;

revoke all on function public.claim_integration_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_integration_jobs(integer) to service_role;
revoke all on function public.claim_integration_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_integration_job(uuid) to service_role;
