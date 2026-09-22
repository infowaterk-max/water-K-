-- Atomically bind admin order lifecycle transitions to the required integration outbox plan.
-- Also refine active e-mail deduplication so different transactional templates cannot suppress each other.

drop index if exists public.integration_jobs_active_order_kind_provider_uidx;

create unique index if not exists integration_jobs_active_order_kind_provider_uidx
on public.integration_jobs(order_id,kind,provider)
where order_id is not null
  and kind<>'email_send'
  and status in ('pending','processing');

create unique index if not exists integration_jobs_active_order_email_template_uidx
on public.integration_jobs(order_id,kind,provider,(payload->>'template'))
where order_id is not null
  and kind='email_send'
  and status in ('pending','processing');

create or replace function public.admin_transition_order_with_outbox_v3(
  p_instance_id uuid,
  p_order_id uuid,
  p_actor uuid,
  p_target_status text,
  p_tracking_number text default null,
  p_jobs jsonb default '[]'::jsonb,
  p_manual_events jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_transition jsonb;
  v_job jsonb;
  v_event jsonb;
  v_kind text;
  v_provider text;
  v_payload jsonb;
  v_template text;
  v_existing_id uuid;
  v_existing_status text;
  v_job_id uuid;
  v_event_id uuid;
  v_jobs_result jsonb:='[]'::jsonb;
  v_events_result jsonb:='[]'::jsonb;
begin
  if p_instance_id is null or p_order_id is null or p_actor is null then
    raise exception 'ORDER_OUTBOX_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then
    raise exception 'ORDER_PERMISSION_REQUIRED';
  end if;
  if jsonb_typeof(coalesce(p_jobs,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_jobs,'[]'::jsonb))>12 then
    raise exception 'ORDER_OUTBOX_PLAN_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_manual_events,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_manual_events,'[]'::jsonb))>6 then
    raise exception 'ORDER_MANUAL_EVENT_PLAN_INVALID';
  end if;

  for v_job in select value from jsonb_array_elements(coalesce(p_jobs,'[]'::jsonb))
  loop
    v_kind:=nullif(trim(v_job->>'kind'),'');
    v_provider:=nullif(trim(v_job->>'provider'),'');
    v_payload:=coalesce(v_job->'payload','{}'::jsonb);
    if v_kind not in ('email_send','invoice_create','shipment_create','logistics_email')
       or v_provider is null
       or length(v_provider)>120
       or jsonb_typeof(v_payload)<>'object' then
      raise exception 'ORDER_OUTBOX_JOB_INVALID';
    end if;
    if v_kind='email_send' then
      v_template:=nullif(trim(v_payload->>'template'),'');
      if v_template not in ('payment_confirmed','order_shipped','order_completed') then
        raise exception 'ORDER_EMAIL_TEMPLATE_INVALID';
      end if;
    end if;
  end loop;

  for v_event in select value from jsonb_array_elements(coalesce(p_manual_events,'[]'::jsonb))
  loop
    if v_event->>'eventType'<>'invoice_manual_required'
       or jsonb_typeof(coalesce(v_event->'metadata','{}'::jsonb))<>'object' then
      raise exception 'ORDER_MANUAL_EVENT_INVALID';
    end if;
  end loop;

  v_transition:=public.admin_transition_order_v2(
    p_instance_id,p_order_id,p_actor,p_target_status,p_tracking_number
  );

  for v_job in select value from jsonb_array_elements(coalesce(p_jobs,'[]'::jsonb))
  loop
    v_kind:=v_job->>'kind';
    v_provider:=v_job->>'provider';
    v_payload:=coalesce(v_job->'payload','{}'::jsonb);
    v_template:=case when v_kind='email_send' then v_payload->>'template' else null end;
    v_existing_id:=null;v_existing_status:=null;

    if v_kind='email_send' then
      select id,status into v_existing_id,v_existing_status
      from public.integration_jobs
      where instance_id=p_instance_id
        and order_id=p_order_id
        and kind=v_kind
        and provider=v_provider
        and coalesce(payload->>'template','')=coalesce(v_template,'')
        and status in ('pending','processing','succeeded')
      order by created_at desc
      limit 1;
    else
      select id,status into v_existing_id,v_existing_status
      from public.integration_jobs
      where instance_id=p_instance_id
        and order_id=p_order_id
        and kind=v_kind
        and provider=v_provider
        and status in ('pending','processing','succeeded')
      order by created_at desc
      limit 1;
    end if;

    if v_existing_id is not null then
      v_jobs_result:=v_jobs_result||jsonb_build_array(jsonb_build_object(
        'id',v_existing_id,'kind',v_kind,'provider',v_provider,
        'status',v_existing_status,'deduplicated',true
      ));
      continue;
    end if;

    begin
      insert into public.integration_jobs(instance_id,order_id,kind,provider,status,payload)
      values(p_instance_id,p_order_id,v_kind,v_provider,'pending',v_payload)
      returning id into v_job_id;
    exception when unique_violation then
      if v_kind='email_send' then
        select id,status into v_job_id,v_existing_status
        from public.integration_jobs
        where instance_id=p_instance_id
          and order_id=p_order_id
          and kind=v_kind
          and provider=v_provider
          and coalesce(payload->>'template','')=coalesce(v_template,'')
          and status in ('pending','processing')
        order by created_at desc
        limit 1;
      else
        select id,status into v_job_id,v_existing_status
        from public.integration_jobs
        where instance_id=p_instance_id
          and order_id=p_order_id
          and kind=v_kind
          and provider=v_provider
          and status in ('pending','processing')
        order by created_at desc
        limit 1;
      end if;
      if v_job_id is null then raise; end if;
    end;

    if v_job_id is null then raise exception 'ORDER_OUTBOX_JOB_EVIDENCE_MISSING'; end if;
    v_jobs_result:=v_jobs_result||jsonb_build_array(jsonb_build_object(
      'id',v_job_id,'kind',v_kind,'provider',v_provider,
      'status',coalesce(v_existing_status,'pending'),
      'deduplicated',v_existing_status is not null
    ));
  end loop;

  for v_event in select value from jsonb_array_elements(coalesce(p_manual_events,'[]'::jsonb))
  loop
    v_event_id:=null;
    select id into v_event_id
    from public.order_events
    where instance_id=p_instance_id
      and order_id=p_order_id
      and event_type='invoice_manual_required'
    order by created_at desc
    limit 1;

    if v_event_id is null then
      insert into public.order_events(
        instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata
      ) values(
        p_instance_id,p_order_id,'invoice_manual_required',
        p_target_status,p_target_status,p_actor,coalesce(v_event->'metadata','{}'::jsonb)
      ) returning id into v_event_id;
    end if;
    if v_event_id is null then raise exception 'ORDER_MANUAL_EVENT_EVIDENCE_MISSING'; end if;
    v_events_result:=v_events_result||jsonb_build_array(jsonb_build_object(
      'id',v_event_id,'eventType','invoice_manual_required'
    ));
  end loop;

  return v_transition||jsonb_build_object(
    'integrationJobs',v_jobs_result,
    'manualEvents',v_events_result
  );
end;
$$;

revoke all on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb)
to service_role;

create or replace function public.admin_retry_integration_job_v2(
  p_instance_id uuid,p_job_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.integration_jobs%rowtype;v_active record;v_new_id uuid;v_org uuid;
begin
  if p_instance_id is null or p_job_id is null or p_actor is null then raise exception 'INTEGRATION_RETRY_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_PERMISSION_REQUIRED'; end if;
  select * into v_job from public.integration_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then raise exception 'INTEGRATION_JOB_NOT_FOUND'; end if;
  if v_job.status not in ('failed','blocked') then raise exception 'INTEGRATION_JOB_NOT_RETRYABLE'; end if;
  if v_job.kind not in ('shipment_create','email_send','invoice_create','logistics_email') then raise exception 'INTEGRATION_KIND_NOT_RETRYABLE'; end if;
  if v_job.order_id is null then raise exception 'INTEGRATION_ORDER_REQUIRED'; end if;
  perform 1 from public.orders where id=v_job.order_id and instance_id=p_instance_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select id,status into v_active from public.integration_jobs
  where instance_id=p_instance_id and order_id=v_job.order_id and kind=v_job.kind and provider=v_job.provider
    and status in ('pending','processing')
    and (
      v_job.kind<>'email_send'
      or coalesce(payload->>'template','')=coalesce(v_job.payload->>'template','')
    )
  order by created_at desc limit 1;
  if found then return jsonb_build_object('jobId',v_active.id,'status',v_active.status,'alreadyActive',true); end if;

  begin
    insert into public.integration_jobs(instance_id,order_id,kind,provider,status,payload,last_error,next_attempt_at)
    values(p_instance_id,v_job.order_id,v_job.kind,v_job.provider,'pending',
      coalesce(v_job.payload,'{}'::jsonb)||jsonb_build_object('retryOfJobId',v_job.id,'retriedBy',p_actor),null,null)
    returning id into v_new_id;
  exception when unique_violation then
    select id,status into v_active from public.integration_jobs
    where instance_id=p_instance_id and order_id=v_job.order_id and kind=v_job.kind and provider=v_job.provider
      and status in ('pending','processing')
      and (
        v_job.kind<>'email_send'
        or coalesce(payload->>'template','')=coalesce(v_job.payload->>'template','')
      )
    order by created_at desc limit 1;
    if not found then raise; end if;
    return jsonb_build_object('jobId',v_active.id,'status',v_active.status,'alreadyActive',true);
  end;

  insert into public.order_events(instance_id,order_id,event_type,actor_user_id,metadata)
  values(p_instance_id,v_job.order_id,'integration_retried',p_actor,
    jsonb_build_object('previous_job_id',v_job.id,'new_job_id',v_new_id,'kind',v_job.kind,'provider',v_job.provider,'previous_error',v_job.last_error));

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'integration_job.retried','integration_job',v_job.id::text,v_org,p_instance_id,left(v_job.kind||' újraindítva',500),
    jsonb_build_object('status',v_job.status,'attemptCount',v_job.attempt_count,'lastError',v_job.last_error),
    jsonb_build_object('newJobId',v_new_id,'status','pending'),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_retry_integration_job_v2','orderId',v_job.order_id,'provider',v_job.provider)
  );
  return jsonb_build_object('jobId',v_new_id,'status','pending','alreadyActive',false);
end $$;

revoke all on function public.admin_retry_integration_job_v2(uuid,uuid,uuid)
from public,anon,authenticated;
grant execute on function public.admin_retry_integration_job_v2(uuid,uuid,uuid)
to service_role;

comment on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb)
is 'Atomically transitions an admin-managed order and guarantees the required tenant-scoped outbox/manual evidence plan.';
comment on index public.integration_jobs_active_order_email_template_uidx
is 'Allows distinct transactional e-mail templates to coexist while deduplicating the same active template.';
