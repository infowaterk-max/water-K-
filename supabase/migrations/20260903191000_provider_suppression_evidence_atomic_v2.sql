-- Provider communication suppression evidence closure.
-- Resolve the tenant from the provider message and persist suppression + lifecycle evidence atomically.

create or replace function public.record_provider_communication_suppression_v2(
  p_provider_message_id text,
  p_provider_event_id text,
  p_email text,
  p_reason text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_provider_message_id text:=trim(coalesce(p_provider_message_id,''));
  v_provider_event_id text:=trim(coalesce(p_provider_event_id,''));
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_reason text:=trim(coalesce(p_reason,''));
  v_instances uuid[];
  v_instance_id uuid;
  v_suppression_id uuid;
  v_event_id uuid;
  v_provider_key text;
  v_duplicate boolean:=false;
begin
  if length(v_provider_message_id)<1 or length(v_provider_message_id)>500 then
    raise exception 'PROVIDER_SUPPRESSION_MESSAGE_ID_INVALID';
  end if;
  if length(v_provider_event_id)<1 or length(v_provider_event_id)>500 then
    raise exception 'PROVIDER_SUPPRESSION_EVENT_ID_INVALID';
  end if;
  if length(v_email)<5 or length(v_email)>320 or position('@' in v_email)=0 then
    raise exception 'PROVIDER_SUPPRESSION_EMAIL_INVALID';
  end if;
  if v_reason not in ('hard_bounce','complaint','invalid') then
    raise exception 'PROVIDER_SUPPRESSION_REASON_INVALID';
  end if;

  select array_agg(distinct j.instance_id order by j.instance_id)
  into v_instances
  from public.communication_jobs j
  where j.provider_message_id=v_provider_message_id
    and lower(trim(j.recipient_email))=v_email;

  if coalesce(cardinality(v_instances),0)=0 then
    return jsonb_build_object(
      'processed',false,
      'reason','unmapped_provider_message',
      'duplicate',false
    );
  end if;
  if cardinality(v_instances)<>1 then
    raise exception 'PROVIDER_SUPPRESSION_TENANT_AMBIGUOUS';
  end if;
  v_instance_id:=v_instances[1];
  v_provider_key:=v_provider_event_id||':'||v_email;

  begin
    insert into public.communication_suppressions(
      instance_id,email,reason,source,provider_event_id,note,active
    ) values(
      v_instance_id,v_email,v_reason,'provider_webhook',
      v_provider_key,left(p_note,1000),true
    )
    returning id into v_suppression_id;
  exception when unique_violation then
    select s.id into v_suppression_id
    from public.communication_suppressions s
    where s.instance_id=v_instance_id
      and s.provider_event_id=v_provider_key
    limit 1;
    if v_suppression_id is null then raise; end if;
    v_duplicate:=true;
  end;

  if v_suppression_id is null then
    raise exception 'PROVIDER_SUPPRESSION_WRITE_EVIDENCE_MISSING';
  end if;

  select e.id into v_event_id
  from public.communication_suppression_events e
  where e.instance_id=v_instance_id
    and e.suppression_id=v_suppression_id
    and e.action='block'
    and coalesce(e.reason,'')=v_reason
  order by e.created_at,e.id
  limit 1;

  if v_event_id is null then
    insert into public.communication_suppression_events(
      instance_id,suppression_id,email,actor_user_id,action,reason,note
    ) values(
      v_instance_id,v_suppression_id,v_email,null,'block',v_reason,left(p_note,1000)
    )
    returning id into v_event_id;
  end if;
  if v_event_id is null then
    raise exception 'PROVIDER_SUPPRESSION_EVENT_EVIDENCE_MISSING';
  end if;

  return jsonb_build_object(
    'processed',true,
    'instanceId',v_instance_id,
    'suppressionId',v_suppression_id,
    'eventId',v_event_id,
    'duplicate',v_duplicate
  );
end;
$$;

revoke all on function public.record_provider_communication_suppression_v2(text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.record_provider_communication_suppression_v2(text,text,text,text,text)
to service_role;

comment on function public.record_provider_communication_suppression_v2(text,text,text,text,text)
is 'Atomically maps a provider communication event to one tenant and persists suppression plus lifecycle evidence with replay-safe provider-event deduplication.';
