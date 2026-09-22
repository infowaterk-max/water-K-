-- Digital Office Composer + Drafts foundation v1.
-- Stable role presets are not changed. New arbitrary 1:1 email compose is an opt-in capability for staff;
-- the active webshop owner may use it directly. Drafts are author-private and service-runtime only.
-- Sending remains fail-closed until an explicitly configured active Digital Office mailbox exists.

insert into public.store_permission_catalog(permission_code,area_code,label,description,sensitivity,delegable)
values(
  'office.email.compose','office','Új ügyfél-e-mail írása','Új, egyedi 1:1 operatív e-mail piszkozatának készítése és elküldése a Digitális Irodából.','sensitive',true
)
on conflict(permission_code) do update set
  area_code=excluded.area_code,
  label=excluded.label,
  description=excluded.description,
  sensitivity=excluded.sensitivity,
  delegable=excluded.delegable,
  updated_at=now();

-- Intentionally NO write to store_role_permission_presets here.

create table if not exists public.office_drafts (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid,
  draft_type text not null check (draft_type in ('new_email','reply')),
  to_email text,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(thread_id,instance_id) references public.office_threads(id,instance_id) on delete cascade,
  check (to_email is null or (length(to_email) between 5 and 320 and position('@' in to_email)>1)),
  check (length(subject)<=300),
  check (length(body)<=10000),
  check ((draft_type='reply' and thread_id is not null) or (draft_type='new_email' and thread_id is null))
);

create index if not exists office_drafts_instance_author_updated_idx
  on public.office_drafts(instance_id,author_user_id,updated_at desc);
create index if not exists office_drafts_thread_idx
  on public.office_drafts(thread_id,instance_id)
  where thread_id is not null;

alter table public.office_drafts enable row level security;
revoke all on table public.office_drafts from public,anon,authenticated;
revoke all on table public.office_drafts from service_role;
grant select,insert,update,delete on table public.office_drafts to service_role;

create or replace function private.office_active_owner_v1(
  p_instance_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
set search_path=''
as $$
  select exists(
    select 1
    from public.webshop_instances w
    join public.role_bindings rb on rb.organization_id=w.organization_id
    where w.id=p_instance_id
      and rb.user_id=p_user_id
      and rb.role_code='owner'
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.revoked_at is null
      and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
  );
$$;

revoke all on function private.office_active_owner_v1(uuid,uuid) from public,anon,authenticated;

create or replace function private.office_can_compose_new_email_v1(
  p_instance_id uuid,
  p_user_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_capability jsonb;
begin
  if private.office_active_owner_v1(p_instance_id,p_user_id) then return true; end if;
  v_capability:=public.evaluate_store_capability_v1(
    p_instance_id,p_user_id,'office.email.compose',p_user_id,p_user_id,null,null
  );
  return coalesce((v_capability->>'allowed')::boolean,false);
end;
$$;

revoke all on function private.office_can_compose_new_email_v1(uuid,uuid) from public,anon,authenticated;

create or replace function public.admin_mutate_office_draft_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_draft public.office_drafts%rowtype;
  v_thread public.office_threads%rowtype;
  v_draft_id uuid;
  v_thread_id uuid;
  v_draft_type text;
  v_to_email text;
  v_subject text;
  v_body text;
  v_capability jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_DRAFT_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_DRAFT_PAYLOAD_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='save' then
    v_draft_id:=case when nullif(trim(coalesce(p_payload->>'draftId','')),'') is null then null else (p_payload->>'draftId')::uuid end;
    v_draft_type:=trim(coalesce(p_payload->>'draftType',''));
    v_thread_id:=case when nullif(trim(coalesce(p_payload->>'threadId','')),'') is null then null else (p_payload->>'threadId')::uuid end;
    v_to_email:=nullif(lower(trim(coalesce(p_payload->>'toEmail',''))),'');
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=coalesce(p_payload->>'body','');
    if v_draft_type not in ('new_email','reply') or length(v_subject)>300 or length(v_body)>10000 then raise exception 'OFFICE_DRAFT_INVALID'; end if;
    if v_to_email is not null and (length(v_to_email)<5 or length(v_to_email)>320 or position('@' in v_to_email)=0) then raise exception 'OFFICE_DRAFT_EMAIL_INVALID'; end if;

    if v_draft_type='reply' then
      if v_thread_id is null then raise exception 'OFFICE_DRAFT_THREAD_REQUIRED'; end if;
      select * into v_thread from public.office_threads
      where id=v_thread_id and instance_id=p_instance_id and conversation_type='customer';
      if not found or not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_DRAFT_THREAD_ACCESS_DENIED'; end if;
      v_capability:=public.evaluate_store_capability_v1(
        p_instance_id,p_actor,'office.thread.reply',v_thread.created_by,v_thread.assigned_to,v_thread.topic_code,v_thread.mailbox_key
      );
      if not coalesce((v_capability->>'allowed')::boolean,false) and not private.office_active_owner_v1(p_instance_id,p_actor) then raise exception 'OFFICE_THREAD_REPLY_PERMISSION_REQUIRED'; end if;
      v_to_email:=lower(trim(coalesce(v_thread.customer_email,'')));
      if v_to_email='' then raise exception 'OFFICE_CUSTOMER_EMAIL_REQUIRED'; end if;
      if v_subject='' then v_subject:='Re: '||v_thread.subject; end if;
    else
      if v_thread_id is not null then raise exception 'OFFICE_NEW_DRAFT_THREAD_FORBIDDEN'; end if;
      if not private.office_can_compose_new_email_v1(p_instance_id,p_actor) then raise exception 'OFFICE_EMAIL_COMPOSE_PERMISSION_REQUIRED'; end if;
    end if;

    if v_draft_id is null then
      insert into public.office_drafts(instance_id,author_user_id,thread_id,draft_type,to_email,subject,body)
      values(p_instance_id,p_actor,v_thread_id,v_draft_type,v_to_email,v_subject,v_body)
      returning * into v_draft;
    else
      update public.office_drafts
      set thread_id=v_thread_id,draft_type=v_draft_type,to_email=v_to_email,subject=v_subject,body=v_body,updated_at=now()
      where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor
      returning * into v_draft;
      if not found then raise exception 'OFFICE_DRAFT_NOT_FOUND'; end if;
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.draft_saved','office_draft',v_draft.id::text,v_org,p_instance_id,
      case when v_draft.draft_type='reply' then 'Digitális Iroda válaszpiszkozat mentve' else 'Digitális Iroda új e-mail piszkozat mentve' end,
      jsonb_build_object('draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,'hasRecipient',v_draft.to_email is not null,'subjectLength',length(v_draft.subject),'bodyLength',length(v_draft.body)),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v1')
    );

    return jsonb_build_object('id',v_draft.id,'draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,'updatedAt',v_draft.updated_at);
  end if;

  if p_action='delete' then
    v_draft_id:=(p_payload->>'draftId')::uuid;
    delete from public.office_drafts
    where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor
    returning * into v_draft;
    if not found then raise exception 'OFFICE_DRAFT_NOT_FOUND'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,metadata
    ) values(
      p_actor,'office.draft_deleted','office_draft',v_draft.id::text,v_org,p_instance_id,
      'Digitális Iroda piszkozat törölve',
      jsonb_build_object('draftType',v_draft.draft_type,'threadId',v_draft.thread_id,'subjectLength',length(v_draft.subject),'bodyLength',length(v_draft.body)),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v1')
    );
    return jsonb_build_object('id',v_draft.id,'draftId',v_draft.id,'deleted',true);
  end if;

  raise exception 'OFFICE_DRAFT_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_office_draft_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate_office_draft_v1(uuid,uuid,text,jsonb) to service_role;

create or replace function public.admin_queue_office_email_v3(
  p_instance_id uuid,
  p_actor uuid,
  p_mode text,
  p_thread_id uuid,
  p_mailbox_key text,
  p_to_email text,
  p_subject text,
  p_body text,
  p_idempotency_key text,
  p_draft_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_mode text:=trim(coalesce(p_mode,''));
  v_thread public.office_threads%rowtype;
  v_thread_id uuid:=p_thread_id;
  v_mailbox_key text:=nullif(lower(trim(coalesce(p_mailbox_key,''))),'');
  v_email text:=nullif(lower(trim(coalesce(p_to_email,''))),'');
  v_subject text:=trim(coalesce(p_subject,''));
  v_body text:=trim(coalesce(p_body,''));
  v_job uuid;
  v_message_id uuid;
  v_order_number text;
  v_capability jsonb;
  v_mailbox_exists boolean:=false;
  v_route_exists boolean:=false;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_EMAIL_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
  if v_mode not in ('reply','new_email') or length(v_body)<1 or length(v_body)>10000 or length(trim(coalesce(p_idempotency_key,'')))<10 then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if v_mode='reply' then
    if v_thread_id is null then raise exception 'OFFICE_THREAD_REQUIRED'; end if;
    select * into v_thread from public.office_threads
    where id=v_thread_id and instance_id=p_instance_id and conversation_type='customer' for update;
    if not found or not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;
    v_capability:=public.evaluate_store_capability_v1(
      p_instance_id,p_actor,'office.thread.reply',v_thread.created_by,v_thread.assigned_to,v_thread.topic_code,v_thread.mailbox_key
    );
    if not coalesce((v_capability->>'allowed')::boolean,false) and not private.office_active_owner_v1(p_instance_id,p_actor) then raise exception 'OFFICE_THREAD_REPLY_PERMISSION_REQUIRED'; end if;
    v_email:=lower(trim(coalesce(v_thread.customer_email,'')));
    if v_email='' then raise exception 'OFFICE_CUSTOMER_EMAIL_REQUIRED'; end if;
    v_mailbox_key:=v_thread.mailbox_key;
    if v_subject='' then v_subject:='Re: '||v_thread.subject; end if;
  else
    if not private.office_can_compose_new_email_v1(p_instance_id,p_actor) then raise exception 'OFFICE_EMAIL_COMPOSE_PERMISSION_REQUIRED'; end if;
    if v_thread_id is not null then raise exception 'OFFICE_NEW_EMAIL_THREAD_FORBIDDEN'; end if;
    if v_email is null or length(v_email)<5 or length(v_email)>320 or position('@' in v_email)=0 then raise exception 'OFFICE_CUSTOMER_EMAIL_REQUIRED'; end if;
    if length(v_subject)<1 or length(v_subject)>300 then raise exception 'OFFICE_EMAIL_SUBJECT_REQUIRED'; end if;
  end if;

  if v_mailbox_key is null then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;
  select exists(
    select 1 from public.office_mailboxes m
    where m.instance_id=p_instance_id and m.mailbox_key=v_mailbox_key and m.is_active=true
  ) into v_mailbox_exists;
  if not v_mailbox_exists then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;

  if v_mode='new_email' then
    insert into public.office_threads(
      instance_id,subject,customer_email,status,priority,created_by,assigned_to,conversation_type,mailbox_key,updated_at
    ) values(
      p_instance_id,v_subject,v_email,'open','normal',p_actor,p_actor,'customer',v_mailbox_key,now()
    ) returning * into v_thread;
    v_thread_id:=v_thread.id;
  end if;

  select exists(
    select 1 from public.office_thread_email_routes r
    where r.instance_id=p_instance_id and r.thread_id=v_thread_id
  ) into v_route_exists;
  if not v_route_exists then raise exception 'OFFICE_EMAIL_ROUTE_MISSING'; end if;

  if v_thread.order_id is not null then
    select order_number into v_order_number from public.orders where id=v_thread.order_id and instance_id=p_instance_id;
    if not found then raise exception 'OFFICE_ORDER_NOT_FOUND'; end if;
  end if;

  v_job:=public.enqueue_communication_v2(
    p_instance_id,
    v_email,
    null,
    'transactional',
    'support_reply',
    jsonb_build_object(
      'name','Vásárlónk',
      'ticketId',v_thread_id,
      'ticketNumber',coalesce(v_order_number,v_thread.subject),
      'replyPreview',v_body,
      'orderNumber',v_order_number,
      'officeThreadId',v_thread_id,
      'emailSubject',v_subject
    ),
    trim(p_idempotency_key),
    now()
  );
  if v_job is null then raise exception 'OFFICE_COMMUNICATION_JOB_MISSING'; end if;

  insert into public.office_messages(
    instance_id,thread_id,author_id,kind,body,communication_job_id,recipient_email,subject
  ) values(
    p_instance_id,v_thread_id,p_actor,'email_out',v_body,v_job,v_email,v_subject
  ) returning id into v_message_id;

  update public.office_threads set updated_at=now()
  where id=v_thread_id and instance_id=p_instance_id;
  if not found then raise exception 'OFFICE_THREAD_UPDATE_MISSING'; end if;

  insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
  values(p_instance_id,v_thread_id,p_actor,now(),p_actor)
  on conflict(instance_id,thread_id,user_id) do update
    set last_read_at=now(),left_at=null,updated_at=now();

  if p_draft_id is not null then
    delete from public.office_drafts
    where id=p_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,case when v_mode='new_email' then 'office.new_email_queued' else 'office.customer_email_queued_v3' end,
    'office_thread',v_thread_id::text,v_org,p_instance_id,
    case when v_mode='new_email' then 'Digitális Iroda új ügyfél-e-mail sorba állítva' else 'Digitális Iroda ügyfélválasz sorba állítva' end,
    jsonb_build_object('threadId',v_thread_id,'communicationJobId',v_job,'messageId',v_message_id,'mailboxKey',v_mailbox_key,'recipient',v_email,'subjectLength',length(v_subject),'bodyLength',length(v_body)),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_queue_office_email_v3')
  );

  return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id,'jobId',v_job,'mailboxKey',v_mailbox_key);
end;
$$;

revoke all on function public.admin_queue_office_email_v3(uuid,uuid,text,uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_queue_office_email_v3(uuid,uuid,text,uuid,text,text,text,text,text,uuid) to service_role;

comment on table public.office_drafts is 'Author-private Digital Office email drafts. Service runtime only; browser roles have no direct table access.';
comment on function public.admin_queue_office_email_v3(uuid,uuid,text,uuid,text,text,text,text,text,uuid)
is 'Queues one approved 1:1 operational Digital Office email only after capability/thread privacy checks and an explicitly active dedicated Office mailbox preflight.';
