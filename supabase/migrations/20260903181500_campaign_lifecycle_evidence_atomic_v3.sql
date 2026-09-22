-- Campaign lifecycle v3: campaign state, recipient queue snapshot, lifecycle event and admin audit
-- must commit together. No recipient enqueue error may be swallowed into a false queued state.

create or replace function public.admin_manage_marketing_campaign_v3(
  p_instance_id uuid,
  p_campaign_id uuid,
  p_actor uuid,
  p_action text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before public.marketing_campaigns%rowtype;
  v_after public.marketing_campaigns%rowtype;
  r record;
  v_job uuid;
  v_queued integer:=0;
  v_excluded integer:=0;
  v_remaining integer:=0;
  v_org uuid;
  v_event_id uuid;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_campaign_id is null or p_actor is null then
    raise exception 'CAMPAIGN_IDENTITY_REQUIRED';
  end if;
  if p_action not in ('submit_review','approve','queue','cancel') then
    raise exception 'CAMPAIGN_ACTION_INVALID';
  end if;
  if not public.can_manage_marketing(p_instance_id,p_actor)
     and not public.is_platform_operator(p_actor) then
    raise exception 'MARKETING_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_before
  from public.marketing_campaigns
  where id=p_campaign_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  if p_action='submit_review' then
    if v_before.status<>'draft' then raise exception 'CAMPAIGN_STATE_INVALID'; end if;
    update public.marketing_campaigns
      set status='review',updated_at=now()
      where id=p_campaign_id and instance_id=p_instance_id;
    if not found then raise exception 'CAMPAIGN_WRITE_EVIDENCE_MISSING'; end if;

  elsif p_action='approve' then
    if v_before.status<>'review' then raise exception 'CAMPAIGN_STATE_INVALID'; end if;
    update public.marketing_campaigns
      set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now()
      where id=p_campaign_id and instance_id=p_instance_id;
    if not found then raise exception 'CAMPAIGN_WRITE_EVIDENCE_MISSING'; end if;

  elsif p_action='queue' then
    if v_before.status<>'approved' then raise exception 'CAMPAIGN_STATE_INVALID'; end if;

    for r in
      select *
      from public.marketing_campaign_recipients
      where instance_id=p_instance_id
        and campaign_id=p_campaign_id
        and eligible=true
        and communication_job_id is null
      order by id
      for update
    loop
      if public.has_marketing_consent_v2(p_instance_id,r.email,'email')
         and not public.is_communication_suppressed_v2(p_instance_id,r.email) then
        v_job:=public.enqueue_communication_v2(
          p_instance_id,
          r.email,
          r.user_id,
          'marketing',
          v_before.template_key,
          jsonb_build_object(
            'customerName',coalesce(r.customer_name,''),
            'campaignId',p_campaign_id
          ),
          concat('campaign:',p_instance_id,':',p_campaign_id,':',lower(r.email)),
          coalesce(v_before.scheduled_at,now())
        );
        if v_job is null then raise exception 'CAMPAIGN_JOB_EVIDENCE_MISSING'; end if;

        update public.marketing_campaign_recipients
          set communication_job_id=v_job
          where id=r.id
            and instance_id=p_instance_id
            and campaign_id=p_campaign_id
            and eligible=true
            and communication_job_id is null;
        if not found then raise exception 'CAMPAIGN_RECIPIENT_LINK_EVIDENCE_MISSING'; end if;
        v_queued:=v_queued+1;
      else
        update public.marketing_campaign_recipients
          set eligible=false,
              exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE'
          where id=r.id
            and instance_id=p_instance_id
            and campaign_id=p_campaign_id
            and eligible=true
            and communication_job_id is null;
        if not found then raise exception 'CAMPAIGN_EXCLUSION_EVIDENCE_MISSING'; end if;
        v_excluded:=v_excluded+1;
      end if;
    end loop;

    select count(*)::integer into v_remaining
    from public.marketing_campaign_recipients
    where instance_id=p_instance_id
      and campaign_id=p_campaign_id
      and eligible=true
      and communication_job_id is null;
    if v_remaining<>0 then raise exception 'CAMPAIGN_QUEUE_EVIDENCE_MISSING'; end if;

    update public.marketing_campaigns
      set status='queued',updated_at=now()
      where id=p_campaign_id and instance_id=p_instance_id;
    if not found then raise exception 'CAMPAIGN_WRITE_EVIDENCE_MISSING'; end if;

  elsif p_action='cancel' then
    if v_before.status in ('queued','completed','cancelled') then raise exception 'CAMPAIGN_STATE_INVALID'; end if;
    update public.marketing_campaigns
      set status='cancelled',updated_at=now()
      where id=p_campaign_id and instance_id=p_instance_id;
    if not found then raise exception 'CAMPAIGN_WRITE_EVIDENCE_MISSING'; end if;
  end if;

  select * into v_after
  from public.marketing_campaigns
  where id=p_campaign_id and instance_id=p_instance_id;
  if not found then raise exception 'CAMPAIGN_AFTER_EVIDENCE_MISSING'; end if;

  insert into public.marketing_campaign_events(
    instance_id,campaign_id,actor_user_id,action,note
  ) values(
    p_instance_id,p_campaign_id,p_actor,p_action,left(p_note,1000)
  ) returning id into v_event_id;
  if v_event_id is null then raise exception 'CAMPAIGN_EVENT_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,
    'campaign.'||p_action,
    'marketing_campaign',
    p_campaign_id::text,
    v_org,
    p_instance_id,
    left(v_before.name||' · '||p_action,500),
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object(
      'audit_source','database_rpc',
      'rpc','admin_manage_marketing_campaign_v3',
      'queued',v_queued,
      'excluded',v_excluded,
      'note',p_note
    )
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'CAMPAIGN_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'ok',true,
    'campaignId',p_campaign_id,
    'status',v_after.status,
    'action',p_action,
    'queued',v_queued,
    'excluded',v_excluded,
    'eventId',v_event_id,
    'auditId',v_audit_id
  );
end;
$$;

revoke all on function public.admin_manage_marketing_campaign_v3(uuid,uuid,uuid,text,text)
from public,anon,authenticated;
grant execute on function public.admin_manage_marketing_campaign_v3(uuid,uuid,uuid,text,text)
to service_role;

revoke all on function public.admin_manage_marketing_campaign_v2(uuid,uuid,uuid,text,text)
from public,anon,authenticated,service_role;

comment on function public.admin_manage_marketing_campaign_v3(uuid,uuid,uuid,text,text)
is 'Atomically manages tenant campaign lifecycle, recipient queue evidence, campaign event and admin audit without swallowing recipient enqueue failures.';
