-- Atomically resolve inbound communication tenant, conversation thread and immutable inbound message.
-- Prevents orphan office threads if message persistence fails and serializes concurrent sender-thread creation.

create or replace function public.record_inbound_office_email_v2(
  p_external_message_id text,
  p_sender_email text,
  p_recipient_email text,
  p_subject text,
  p_body text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_message_key text:=trim(coalesce(p_external_message_id,''));
  v_sender text:=lower(trim(coalesce(p_sender_email,'')));
  v_recipient text:=lower(trim(coalesce(p_recipient_email,'')));
  v_subject text:=trim(coalesce(p_subject,''));
  v_body text:=trim(coalesce(p_body,''));
  v_instance_id uuid;
  v_instance_ids uuid[];
  v_existing record;
  v_thread_id uuid;
  v_order_id uuid;
  v_message_id uuid;
begin
  if length(v_message_key)<3 or length(v_message_key)>500 then raise exception 'INBOUND_MESSAGE_ID_INVALID'; end if;
  if length(v_sender)<5 or length(v_sender)>320 or position('@' in v_sender)=0 then raise exception 'INBOUND_SENDER_INVALID'; end if;
  if length(v_recipient)<5 or length(v_recipient)>320 or position('@' in v_recipient)=0 then raise exception 'INBOUND_RECIPIENT_INVALID'; end if;
  if length(v_subject)<1 or length(v_subject)>300 then raise exception 'INBOUND_SUBJECT_INVALID'; end if;
  if length(v_body)<1 or length(v_body)>50000 then raise exception 'INBOUND_BODY_INVALID'; end if;

  select array_agg(w.id order by w.id)
  into v_instance_ids
  from public.webshop_instances w
  where lower(trim(coalesce(w.support_email,'')))=v_recipient
    and w.status in ('pilot','active');

  if coalesce(cardinality(v_instance_ids),0)=0 then raise exception 'INBOUND_TENANT_NOT_FOUND'; end if;
  if cardinality(v_instance_ids)<>1 then raise exception 'INBOUND_TENANT_AMBIGUOUS'; end if;
  v_instance_id:=v_instance_ids[1];

  -- Serialize thread selection/creation for the same tenant + sender.
  perform pg_advisory_xact_lock(hashtextextended(v_instance_id::text||':'||v_sender,0));

  select m.id,m.thread_id
  into v_existing
  from public.office_messages m
  where m.instance_id=v_instance_id
    and m.external_message_id=v_message_key
  limit 1;
  if found then
    return jsonb_build_object(
      'id',v_existing.id,
      'threadId',v_existing.thread_id,
      'instanceId',v_instance_id,
      'duplicate',true
    );
  end if;

  select t.id
  into v_thread_id
  from public.office_threads t
  where t.instance_id=v_instance_id
    and lower(trim(coalesce(t.customer_email,'')))=v_sender
    and t.status='open'
  order by t.updated_at desc,t.id
  limit 1
  for update;

  if v_thread_id is null then
    select o.id
    into v_order_id
    from public.orders o
    where o.instance_id=v_instance_id
      and lower(trim(o.customer_email))=v_sender
    order by o.created_at desc,o.id
    limit 1;

    insert into public.office_threads(
      instance_id,subject,customer_email,order_id,created_at,updated_at
    ) values(
      v_instance_id,v_subject,v_sender,v_order_id,now(),now()
    )
    returning id into v_thread_id;
  end if;

  begin
    insert into public.office_messages(
      instance_id,thread_id,kind,body,external_message_id,
      sender_email,recipient_email,subject
    ) values(
      v_instance_id,v_thread_id,'email_in',v_body,v_message_key,
      v_sender,v_recipient,v_subject
    )
    returning id into v_message_id;
  exception when unique_violation then
    select m.id,m.thread_id
    into v_message_id,v_thread_id
    from public.office_messages m
    where m.instance_id=v_instance_id
      and m.external_message_id=v_message_key
    limit 1;
    if v_message_id is null then raise; end if;
    return jsonb_build_object(
      'id',v_message_id,
      'threadId',v_thread_id,
      'instanceId',v_instance_id,
      'duplicate',true
    );
  end;

  update public.office_threads
  set updated_at=now()
  where id=v_thread_id and instance_id=v_instance_id;
  if not found then raise exception 'INBOUND_THREAD_EVIDENCE_MISSING'; end if;

  if v_message_id is null then raise exception 'INBOUND_MESSAGE_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'id',v_message_id,
    'threadId',v_thread_id,
    'instanceId',v_instance_id,
    'duplicate',false
  );
end;
$$;

revoke all on function public.record_inbound_office_email_v2(text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.record_inbound_office_email_v2(text,text,text,text,text)
to service_role;

comment on function public.record_inbound_office_email_v2(text,text,text,text,text)
is 'Atomically resolves one active/pilot tenant from support recipient, reuses/creates its sender thread and persists exactly one inbound office message.';
