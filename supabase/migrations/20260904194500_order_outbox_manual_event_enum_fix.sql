-- Production pilot acceptance: fix the remaining enum/text mismatch in the
-- manual invoice evidence path of admin order transitions.
--
-- The public RPC intentionally accepts p_target_status as text for PostgREST,
-- while order_events.from_status/to_status are public.order_status. The core
-- transition already validates the target status; this function must persist
-- that validated value with an explicit enum cast as well.

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
        p_target_status::public.order_status,
        p_target_status::public.order_status,
        p_actor,coalesce(v_event->'metadata','{}'::jsonb)
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

comment on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb)
is 'Atomically transitions an admin-managed order and guarantees tenant-scoped outbox/manual evidence with enum-safe order status evidence.';
