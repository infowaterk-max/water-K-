create or replace function public.claim_integration_jobs(p_limit integer default 10)
returns table(id uuid)
language plpgsql
security definer
set search_path = public
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
    set status='processing', updated_at=now()
    from picked
    where j.id=picked.id
    returning j.id
  )
  select claimed.id from claimed;
end;
$$;
revoke all on function public.claim_integration_jobs(integer) from public;
grant execute on function public.claim_integration_jobs(integer) to service_role;
