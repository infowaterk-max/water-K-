-- Make communication delivery, not queue admission, authoritative for customer journey completion.
-- Existing v2 RPC names stay compatible with runtime callers while queued=>completed false positives
-- are closed and all delivery writers preserve the established journey-step -> communication-job lock order.

alter table public.customer_journey_steps
  drop constraint if exists customer_journey_steps_status_check;
alter table public.customer_journey_steps
  add constraint customer_journey_steps_status_check
  check(status in('pending','queued','sent','blocked','cancelled'));

-- Reconcile already queued journey steps against the current communication queue.
update public.customer_journey_steps js
set
  status=case
    when q.status='sent' then 'sent'
    when q.status in('failed','blocked') then 'blocked'
    when q.status='cancelled' then 'cancelled'
    else js.status
  end,
  updated_at=now()
from public.communication_jobs q
where js.instance_id=q.instance_id
  and js.communication_job_id=q.id
  and js.status='queued'
  and q.status in('sent','failed','blocked','cancelled');

-- Legacy dispatch marked a journey completed as soon as no pending step remained. Re-open any
-- journey that still has pending/queued delivery work, then derive terminal state from delivery evidence.
update public.customer_journeys j
set
  status='active',
  completed_at=null,
  updated_at=now(),
  metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
    'deliveryAuthority','communication_jobs',
    'deliveryReconciledAt',now()
  )
where j.status in('completed','blocked')
  and exists(
    select 1 from public.customer_journey_steps js
    where js.instance_id=j.instance_id
      and js.journey_id=j.id
      and js.status in('pending','queued')
  );

update public.customer_journeys j
set
  status='blocked',
  completed_at=null,
  updated_at=now(),
  metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
    'deliveryAuthority','communication_jobs',
    'deliveryReconciledAt',now()
  )
where j.status in('active','completed','blocked')
  and not exists(
    select 1 from public.customer_journey_steps js
    where js.instance_id=j.instance_id
      and js.journey_id=j.id
      and js.status in('pending','queued')
  )
  and exists(
    select 1 from public.customer_journey_steps js
    where js.instance_id=j.instance_id
      and js.journey_id=j.id
      and js.status='blocked'
  );

update public.customer_journeys j
set
  status='completed',
  completed_at=coalesce(j.completed_at,now()),
  updated_at=now(),
  metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
    'deliveryAuthority','communication_jobs',
    'deliveryReconciledAt',now()
  )
where j.status in('active','completed','blocked')
  and not exists(
    select 1 from public.customer_journey_steps js
    where js.instance_id=j.instance_id
      and js.journey_id=j.id
      and js.status in('pending','queued','blocked')
  )
  and exists(
    select 1 from public.customer_journey_steps js
    where js.instance_id=j.instance_id
      and js.journey_id=j.id
      and js.status='sent'
  );

create or replace function public.reconcile_customer_journey_delivery_v3(
  p_instance_id uuid,
  p_job_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_journey_id uuid;
  v_job_status text;
  v_step_status text;
  v_journey_status public.customer_journey_status;
  v_link_count integer:=0;
  v_distinct_journeys integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if p_job_id is null then raise exception 'job_required'; end if;

  select count(*)::integer,count(distinct js.journey_id)::integer
  into v_link_count,v_distinct_journeys
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_job_id;

  if v_link_count=0 then
    if not exists(
      select 1 from public.communication_jobs q
      where q.instance_id=p_instance_id and q.id=p_job_id
    ) then raise exception 'communication job not found in webshop'; end if;
    return jsonb_build_object(
      'instanceId',p_instance_id,
      'jobId',p_job_id,
      'linked',false,
      'stepStatus',null,
      'journeyStatus',null
    );
  end if;

  if v_distinct_journeys<>1 then
    raise exception 'JOURNEY_JOB_LINK_AMBIGUOUS';
  end if;

  select js.journey_id into v_journey_id
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_job_id
  order by js.id
  limit 1;

  -- Preserve global lock order: journey step(s) first, communication job second.
  perform js.id
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_job_id
  order by js.id
  for update;

  select q.status into v_job_status
  from public.communication_jobs q
  where q.instance_id=p_instance_id
    and q.id=p_job_id
  for update;
  if not found then raise exception 'communication job not found in webshop'; end if;

  if v_job_status='sent' then
    update public.customer_journey_steps js
    set status='sent',updated_at=now()
    where js.instance_id=p_instance_id
      and js.communication_job_id=p_job_id
      and js.status='queued';
  elsif v_job_status in('failed','blocked') then
    update public.customer_journey_steps js
    set status='blocked',updated_at=now()
    where js.instance_id=p_instance_id
      and js.communication_job_id=p_job_id
      and js.status='queued';
  elsif v_job_status='cancelled' then
    update public.customer_journey_steps js
    set status='cancelled',updated_at=now()
    where js.instance_id=p_instance_id
      and js.communication_job_id=p_job_id
      and js.status in('pending','queued');
  end if;

  select j.status into v_journey_status
  from public.customer_journeys j
  where j.instance_id=p_instance_id
    and j.id=v_journey_id
  for update;
  if not found then raise exception 'journey not found in webshop'; end if;

  -- Explicitly cancelled journeys remain cancelled even if a racing worker finishes afterward.
  if v_journey_status<>'cancelled' then
    if exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=v_journey_id
        and js.status in('pending','queued')
    ) then
      update public.customer_journeys j
      set
        status='active',
        completed_at=null,
        updated_at=now(),
        metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
          'deliveryAuthority','communication_jobs',
          'deliveryReconciledAt',now()
        )
      where j.instance_id=p_instance_id and j.id=v_journey_id;
    elsif exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=v_journey_id
        and js.status='blocked'
    ) then
      update public.customer_journeys j
      set
        status='blocked',
        completed_at=null,
        updated_at=now(),
        metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
          'deliveryAuthority','communication_jobs',
          'deliveryReconciledAt',now()
        )
      where j.instance_id=p_instance_id and j.id=v_journey_id;
    elsif exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=v_journey_id
        and js.status='sent'
    ) then
      update public.customer_journeys j
      set
        status='completed',
        completed_at=coalesce(j.completed_at,now()),
        updated_at=now(),
        metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
          'deliveryAuthority','communication_jobs',
          'deliveryReconciledAt',now()
        )
      where j.instance_id=p_instance_id and j.id=v_journey_id;
    elsif exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=v_journey_id
    ) then
      update public.customer_journeys j
      set
        status='cancelled',
        completed_at=coalesce(j.completed_at,now()),
        updated_at=now(),
        metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
          'deliveryAuthority','communication_jobs',
          'deliveryReconciledAt',now()
        )
      where j.instance_id=p_instance_id and j.id=v_journey_id;
    end if;
  end if;

  select js.status into v_step_status
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_job_id
  order by js.id
  limit 1;

  select j.status into v_journey_status
  from public.customer_journeys j
  where j.instance_id=p_instance_id and j.id=v_journey_id;

  return jsonb_build_object(
    'instanceId',p_instance_id,
    'jobId',p_job_id,
    'linked',true,
    'stepStatus',v_step_status,
    'journeyStatus',v_journey_status
  );
end;
$$;

revoke all on function public.reconcile_customer_journey_delivery_v3(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.reconcile_customer_journey_delivery_v3(uuid,uuid)
to service_role;

create or replace function public.complete_communication_job_v2(
  p_instance_id uuid,
  p_id uuid,
  p_claim_token uuid,
  p_provider_message_id text
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_rows integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  perform js.id
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_id
    and js.status='queued'
  order by js.id
  for update;

  update public.communication_jobs q
  set
    status='sent',
    provider_message_id=p_provider_message_id,
    sent_at=now(),
    claim_token=null,
    claimed_at=null,
    last_error=null,
    updated_at=now()
  where q.instance_id=p_instance_id
    and q.id=p_id
    and q.status='processing'
    and q.claim_token=p_claim_token;
  get diagnostics v_rows=row_count;
  if v_rows<>1 then return false; end if;

  perform public.reconcile_customer_journey_delivery_v3(p_instance_id,p_id);
  return true;
end;
$$;

create or replace function public.fail_communication_job_v2(
  p_instance_id uuid,
  p_id uuid,
  p_claim_token uuid,
  p_error text,
  p_retry boolean default true
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_rows integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  perform js.id
  from public.customer_journey_steps js
  where js.instance_id=p_instance_id
    and js.communication_job_id=p_id
    and js.status='queued'
  order by js.id
  for update;

  update public.communication_jobs q
  set
    status=case when p_retry and q.attempts<5 then 'pending' else 'failed' end,
    last_error=left(p_error,2000),
    scheduled_at=case when p_retry and q.attempts<5
      then now()+make_interval(mins=>least(60,q.attempts*5))
      else q.scheduled_at end,
    claim_token=null,
    claimed_at=null,
    updated_at=now()
  where q.instance_id=p_instance_id
    and q.id=p_id
    and q.status='processing'
    and q.claim_token=p_claim_token;
  get diagnostics v_rows=row_count;
  if v_rows<>1 then return false; end if;

  perform public.reconcile_customer_journey_delivery_v3(p_instance_id,p_id);
  return true;
end;
$$;

create or replace function public.recover_stale_communication_jobs_v2(
  p_instance_id uuid,
  p_stale_minutes integer default 15
) returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  r record;
  v_count integer:=0;
  v_rows integer:=0;
  v_status text;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  for r in
    select q.id
    from public.communication_jobs q
    where q.instance_id=p_instance_id
      and q.status='processing'
      and q.claimed_at is not null
      and q.claimed_at<now()-make_interval(mins=>greatest(5,p_stale_minutes))
    order by q.id
  loop
    perform js.id
    from public.customer_journey_steps js
    where js.instance_id=p_instance_id
      and js.communication_job_id=r.id
      and js.status='queued'
    order by js.id
    for update;

    update public.communication_jobs q
    set
      status=case when q.attempts<5 then 'pending' else 'failed' end,
      scheduled_at=case when q.attempts<5 then now()+interval '5 minutes' else q.scheduled_at end,
      last_error=case when q.attempts<5
        then 'STALE_WORKER_CLAIM_RECOVERED'
        else 'STALE_WORKER_CLAIM_MAX_ATTEMPTS' end,
      claim_token=null,
      claimed_at=null,
      updated_at=now()
    where q.instance_id=p_instance_id
      and q.id=r.id
      and q.status='processing'
      and q.claimed_at is not null
      and q.claimed_at<now()-make_interval(mins=>greatest(5,p_stale_minutes))
    returning q.status into v_status;
    get diagnostics v_rows=row_count;

    if v_rows=1 then
      v_count:=v_count+1;
      perform public.reconcile_customer_journey_delivery_v3(p_instance_id,r.id);
    end if;
  end loop;

  return v_count;
end;
$$;

-- Queue admission is not a successful journey outcome. Keep queued deliveries active and only
-- resolve a journey when the linked communication has a terminal delivery state.
create or replace function public.dispatch_due_customer_journey_steps_v2(
  p_instance_id uuid,
  p_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  s record;
  v_job uuid;
  v_queued integer:=0;
  v_blocked integer:=0;
  v_seen integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  for s in
    select
      js.id,js.journey_id,js.step_key,js.purpose,js.template_key,js.scheduled_at,
      j.user_id,j.email,j.kind,j.source_key,j.metadata
    from public.customer_journey_steps js
    join public.customer_journeys j
      on j.id=js.journey_id
      and j.instance_id=js.instance_id
    where js.instance_id=p_instance_id
      and j.instance_id=p_instance_id
      and js.status='pending'
      and js.scheduled_at<=now()
      and j.status='active'
    order by js.scheduled_at,js.id
    for update of js skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  loop
    v_seen:=v_seen+1;
    begin
      select public.enqueue_communication_v2(
        p_instance_id,
        s.email,
        s.user_id,
        s.purpose,
        s.template_key,
        coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object(
          'journeyId',s.journey_id,
          'journeyKind',s.kind,
          'journeySourceKey',s.source_key,
          'journeyStep',s.step_key
        ),
        concat('journey:',p_instance_id,':',s.journey_id,':',s.step_key),
        s.scheduled_at
      ) into v_job;

      update public.customer_journey_steps js
      set status='queued',communication_job_id=v_job,updated_at=now()
      where js.id=s.id
        and js.instance_id=p_instance_id
        and js.status='pending';
      if found then
        v_queued:=v_queued+1;
        -- enqueue_communication_v2 is idempotent and may return a previously terminal job.
        perform public.reconcile_customer_journey_delivery_v3(p_instance_id,v_job);
      end if;
    exception when others then
      update public.customer_journey_steps js
      set status='blocked',updated_at=now()
      where js.id=s.id
        and js.instance_id=p_instance_id
        and js.status='pending';
      if found then v_blocked:=v_blocked+1; end if;
    end;
  end loop;

  update public.customer_journeys j
  set
    status='blocked',
    completed_at=null,
    updated_at=now(),
    metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
      'deliveryAuthority','communication_jobs',
      'deliveryReconciledAt',now()
    )
  where j.instance_id=p_instance_id
    and j.status='active'
    and exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
    )
    and not exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
        and js.status in('pending','queued')
    )
    and exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
        and js.status='blocked'
    );

  update public.customer_journeys j
  set
    status='completed',
    completed_at=coalesce(j.completed_at,now()),
    updated_at=now(),
    metadata=coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object(
      'deliveryAuthority','communication_jobs',
      'deliveryReconciledAt',now()
    )
  where j.instance_id=p_instance_id
    and j.status='active'
    and not exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
        and js.status in('pending','queued','blocked')
    )
    and exists(
      select 1 from public.customer_journey_steps js
      where js.instance_id=p_instance_id
        and js.journey_id=j.id
        and js.status='sent'
    );

  return jsonb_build_object(
    'seen',v_seen,
    'queued',v_queued,
    'blocked',v_blocked
  );
end;
$$;

revoke all on function public.complete_communication_job_v2(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.complete_communication_job_v2(uuid,uuid,uuid,text)
to service_role;

revoke all on function public.fail_communication_job_v2(uuid,uuid,uuid,text,boolean)
from public,anon,authenticated;
grant execute on function public.fail_communication_job_v2(uuid,uuid,uuid,text,boolean)
to service_role;

revoke all on function public.recover_stale_communication_jobs_v2(uuid,integer)
from public,anon,authenticated;
grant execute on function public.recover_stale_communication_jobs_v2(uuid,integer)
to service_role;

revoke all on function public.dispatch_due_customer_journey_steps_v2(uuid,integer)
from public,anon,authenticated;
grant execute on function public.dispatch_due_customer_journey_steps_v2(uuid,integer)
to service_role;

comment on function public.reconcile_customer_journey_delivery_v3(uuid,uuid)
is 'Derives tenant journey-step and journey terminal state from the linked communication job using step-before-job locking.';
comment on function public.dispatch_due_customer_journey_steps_v2(uuid,integer)
is 'Tenant journey dispatcher: queue admission stays active; completion requires sent communication evidence.';
