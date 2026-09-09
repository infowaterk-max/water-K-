-- Digital Office recipient-envelope + attachment metadata foundation.
-- Stacked on the autosave/revision foundation. No mailbox, DNS, MX, receiving, storage bucket or role preset is activated here.

alter table public.office_drafts
  add column if not exists cc_emails text[] not null default '{}'::text[],
  add column if not exists bcc_emails text[] not null default '{}'::text[];

alter table public.office_messages
  add column if not exists cc_emails text[] not null default '{}'::text[],
  add column if not exists bcc_emails text[] not null default '{}'::text[];

alter table public.office_drafts drop constraint if exists office_drafts_cc_count_check;
alter table public.office_drafts add constraint office_drafts_cc_count_check check (cardinality(cc_emails)<=10);
alter table public.office_drafts drop constraint if exists office_drafts_bcc_count_check;
alter table public.office_drafts add constraint office_drafts_bcc_count_check check (cardinality(bcc_emails)<=10);
alter table public.office_messages drop constraint if exists office_messages_cc_count_check;
alter table public.office_messages add constraint office_messages_cc_count_check check (cardinality(cc_emails)<=10);
alter table public.office_messages drop constraint if exists office_messages_bcc_count_check;
alter table public.office_messages add constraint office_messages_bcc_count_check check (cardinality(bcc_emails)<=10);

create or replace function private.office_jsonb_text_array_v1(p_value jsonb)
returns text[]
language sql
immutable
set search_path=''
as $$
  select case
    when p_value is null or p_value='null'::jsonb then '{}'::text[]
    when jsonb_typeof(p_value)<>'array' then null
    else coalesce(array(select jsonb_array_elements_text(p_value)),'{}'::text[])
  end;
$$;

revoke all on function private.office_jsonb_text_array_v1(jsonb) from public,anon,authenticated;

create or replace function private.normalize_office_email_list_v1(
  p_emails text[],
  p_exclude text[] default '{}'::text[],
  p_limit integer default 10
) returns text[]
language plpgsql
immutable
set search_path=''
as $$
declare
  v_raw text;
  v_email text;
  v_result text[]:='{}'::text[];
  v_exclude text[]:=coalesce(p_exclude,'{}'::text[]);
begin
  if p_limit<0 or p_limit>20 then raise exception 'OFFICE_EMAIL_LIST_LIMIT_INVALID'; end if;
  if coalesce(cardinality(p_emails),0)>20 then raise exception 'OFFICE_EMAIL_LIST_TOO_LARGE'; end if;

  foreach v_raw in array coalesce(p_emails,'{}'::text[]) loop
    v_email:=lower(trim(coalesce(v_raw,'')));
    if v_email='' then continue; end if;
    if length(v_email)<5 or length(v_email)>320 or position('@' in v_email)<=1 or v_email~E'[\\r\\n]' then
      raise exception 'OFFICE_EMAIL_LIST_INVALID';
    end if;
    if v_email=any(v_exclude) or v_email=any(v_result) then continue; end if;
    v_result:=array_append(v_result,v_email);
    if cardinality(v_result)>p_limit then raise exception 'OFFICE_EMAIL_LIST_TOO_LARGE'; end if;
  end loop;
  return v_result;
end;
$$;

revoke all on function private.normalize_office_email_list_v1(text[],text[],integer) from public,anon,authenticated;

-- Metadata only. Binary upload/storage activation is deliberately a later, separately gated release.
create unique index if not exists office_drafts_id_instance_unique
  on public.office_drafts(id,instance_id);
create unique index if not exists office_messages_id_instance_unique
  on public.office_messages(id,instance_id);

create table if not exists public.office_attachments (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  draft_id uuid,
  message_id uuid,
  uploaded_by uuid references auth.users(id) on delete set null,
  source text not null check (source in ('draft_upload','inbound','outbound')),
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  storage_bucket text,
  storage_path text,
  provider_attachment_id text,
  sha256 text,
  status text not null default 'registered' check (status in ('registered','ready','quarantined','failed','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(draft_id,instance_id) references public.office_drafts(id,instance_id) on delete cascade,
  foreign key(message_id,instance_id) references public.office_messages(id,instance_id) on delete cascade,
  check ((draft_id is not null)::int + (message_id is not null)::int = 1),
  check (length(file_name) between 1 and 255),
  check (length(content_type) between 1 and 200),
  check (size_bytes between 1 and 26214400),
  check (storage_bucket is null or length(storage_bucket) between 1 and 100),
  check (storage_path is null or length(storage_path) between 1 and 1000),
  check (sha256 is null or sha256~'^[0-9a-f]{64}$')
);

create index if not exists office_attachments_draft_idx
  on public.office_attachments(instance_id,draft_id,created_at)
  where draft_id is not null;
create index if not exists office_attachments_message_idx
  on public.office_attachments(instance_id,message_id,created_at)
  where message_id is not null;
create index if not exists office_attachments_status_idx
  on public.office_attachments(instance_id,status,created_at);

alter table public.office_attachments enable row level security;
revoke all on table public.office_attachments from public,anon,authenticated;
revoke all on table public.office_attachments from service_role;
grant select,insert,update,delete on table public.office_attachments to service_role;

create or replace function public.admin_mutate_office_draft_v3(
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
  v_cc text[];
  v_bcc text[];
  v_subject text;
  v_body text;
  v_capability jsonb;
  v_expected_revision bigint;
  v_save_mode text;
  v_was_new boolean:=false;
  v_cc_raw text[];
  v_bcc_raw text[];
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_DRAFT_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_DRAFT_PAYLOAD_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='save' then
    v_draft_id:=case when nullif(trim(coalesce(p_payload->>'draftId','')),'') is null then null else (p_payload->>'draftId')::uuid end;
    v_expected_revision:=case when nullif(trim(coalesce(p_payload->>'expectedRevision','')),'') is null then null else (p_payload->>'expectedRevision')::bigint end;
    v_save_mode:=coalesce(nullif(trim(p_payload->>'saveMode'),''),'manual');
    v_draft_type:=trim(coalesce(p_payload->>'draftType',''));
    v_thread_id:=case when nullif(trim(coalesce(p_payload->>'threadId','')),'') is null then null else (p_payload->>'threadId')::uuid end;
    v_to_email:=nullif(lower(trim(coalesce(p_payload->>'toEmail',''))),'');
    v_cc_raw:=private.office_jsonb_text_array_v1(p_payload->'ccEmails');
    v_bcc_raw:=private.office_jsonb_text_array_v1(p_payload->'bccEmails');
    if v_cc_raw is null or v_bcc_raw is null then raise exception 'OFFICE_EMAIL_LIST_INVALID'; end if;
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=coalesce(p_payload->>'body','');

    if v_save_mode not in ('manual','autosave') then raise exception 'OFFICE_DRAFT_SAVE_MODE_INVALID'; end if;
    if v_draft_type not in ('new_email','reply') or length(v_subject)>300 or length(v_body)>10000 then raise exception 'OFFICE_DRAFT_INVALID'; end if;
    if v_to_email is not null and (length(v_to_email)<5 or length(v_to_email)>320 or position('@' in v_to_email)<=1 or v_to_email~E'[\\r\\n]') then raise exception 'OFFICE_DRAFT_EMAIL_INVALID'; end if;
    if v_draft_id is not null and (v_expected_revision is null or v_expected_revision<1) then raise exception 'OFFICE_DRAFT_REVISION_REQUIRED'; end if;

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

    v_cc:=private.normalize_office_email_list_v1(v_cc_raw,case when v_to_email is null then '{}'::text[] else array[v_to_email] end,10);
    v_bcc:=private.normalize_office_email_list_v1(v_bcc_raw,(case when v_to_email is null then '{}'::text[] else array[v_to_email] end)||v_cc,10);

    if v_draft_id is null then
      v_was_new:=true;
      insert into public.office_drafts(instance_id,author_user_id,thread_id,draft_type,to_email,cc_emails,bcc_emails,subject,body,revision)
      values(p_instance_id,p_actor,v_thread_id,v_draft_type,v_to_email,v_cc,v_bcc,v_subject,v_body,1)
      returning * into v_draft;
    else
      update public.office_drafts
      set thread_id=v_thread_id,draft_type=v_draft_type,to_email=v_to_email,cc_emails=v_cc,bcc_emails=v_bcc,
          subject=v_subject,body=v_body,revision=revision+1,updated_at=now()
      where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor and revision=v_expected_revision
      returning * into v_draft;
      if not found then
        perform 1 from public.office_drafts where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
        if found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;
        raise exception 'OFFICE_DRAFT_NOT_FOUND';
      end if;
    end if;

    if v_was_new or v_save_mode='manual' then
      insert into public.admin_audit_log(
        actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
      ) values(
        p_actor,case when v_was_new then 'office.draft_created' else 'office.draft_saved' end,
        'office_draft',v_draft.id::text,v_org,p_instance_id,
        case
          when v_was_new and v_draft.draft_type='reply' then 'Digitális Iroda válaszpiszkozat létrehozva'
          when v_was_new then 'Digitális Iroda új e-mail piszkozat létrehozva'
          when v_draft.draft_type='reply' then 'Digitális Iroda válaszpiszkozat kézzel mentve'
          else 'Digitális Iroda új e-mail piszkozat kézzel mentve'
        end,
        jsonb_build_object(
          'draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,
          'hasRecipient',v_draft.to_email is not null,'ccCount',cardinality(v_draft.cc_emails),'bccCount',cardinality(v_draft.bcc_emails),
          'subjectLength',length(v_draft.subject),'bodyLength',length(v_draft.body),'revision',v_draft.revision
        ),
        jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v3','saveMode',v_save_mode)
      );
    end if;

    return jsonb_build_object(
      'id',v_draft.id,'draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,
      'revision',v_draft.revision,'updatedAt',v_draft.updated_at,'saveMode',v_save_mode,
      'ccCount',cardinality(v_draft.cc_emails),'bccCount',cardinality(v_draft.bcc_emails)
    );
  end if;

  if p_action='delete' then
    v_draft_id:=(p_payload->>'draftId')::uuid;
    v_expected_revision:=case when nullif(trim(coalesce(p_payload->>'expectedRevision','')),'') is null then null else (p_payload->>'expectedRevision')::bigint end;
    if v_expected_revision is null or v_expected_revision<1 then raise exception 'OFFICE_DRAFT_REVISION_REQUIRED'; end if;

    delete from public.office_drafts
    where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor and revision=v_expected_revision
    returning * into v_draft;
    if not found then
      perform 1 from public.office_drafts where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
      if found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;
      raise exception 'OFFICE_DRAFT_NOT_FOUND';
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,metadata
    ) values(
      p_actor,'office.draft_deleted','office_draft',v_draft.id::text,v_org,p_instance_id,'Digitális Iroda piszkozat törölve',
      jsonb_build_object('draftType',v_draft.draft_type,'threadId',v_draft.thread_id,'ccCount',cardinality(v_draft.cc_emails),'bccCount',cardinality(v_draft.bcc_emails),'subjectLength',length(v_draft.subject),'bodyLength',length(v_draft.body),'revision',v_draft.revision),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v3')
    );
    return jsonb_build_object('id',v_draft.id,'draftId',v_draft.id,'deleted',true,'revision',v_draft.revision);
  end if;

  raise exception 'OFFICE_DRAFT_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_office_draft_v3(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate_office_draft_v3(uuid,uuid,text,jsonb) to service_role;

create or replace function public.admin_queue_office_email_v4(
  p_instance_id uuid,
  p_actor uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_mode text;
  v_thread public.office_threads%rowtype;
  v_thread_id uuid;
  v_mailbox_key text;
  v_email text;
  v_cc_raw text[];
  v_bcc_raw text[];
  v_cc text[];
  v_bcc text[];
  v_subject text;
  v_body text;
  v_idempotency_key text;
  v_draft_id uuid;
  v_draft_revision bigint;
  v_draft public.office_drafts%rowtype;
  v_job uuid;
  v_message_id uuid;
  v_order_number text;
  v_capability jsonb;
  v_mailbox_exists boolean:=false;
  v_route_exists boolean:=false;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_EMAIL_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;

  v_mode:=trim(coalesce(p_payload->>'mode',''));
  v_thread_id:=case when nullif(trim(coalesce(p_payload->>'threadId','')),'') is null then null else (p_payload->>'threadId')::uuid end;
  v_mailbox_key:=nullif(lower(trim(coalesce(p_payload->>'mailboxKey',''))),'');
  v_email:=nullif(lower(trim(coalesce(p_payload->>'toEmail',''))),'');
  v_cc_raw:=private.office_jsonb_text_array_v1(p_payload->'ccEmails');
  v_bcc_raw:=private.office_jsonb_text_array_v1(p_payload->'bccEmails');
  v_subject:=trim(coalesce(p_payload->>'subject',''));
  v_body:=coalesce(p_payload->>'body','');
  v_idempotency_key:=trim(coalesce(p_payload->>'idempotencyKey',''));
  v_draft_id:=case when nullif(trim(coalesce(p_payload->>'draftId','')),'') is null then null else (p_payload->>'draftId')::uuid end;
  v_draft_revision:=case when nullif(trim(coalesce(p_payload->>'draftRevision','')),'') is null then null else (p_payload->>'draftRevision')::bigint end;

  if v_cc_raw is null or v_bcc_raw is null then raise exception 'OFFICE_EMAIL_LIST_INVALID'; end if;
  if v_mode not in ('reply','new_email') or length(trim(v_body))<1 or length(v_body)>10000 or length(v_idempotency_key)<10 then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
  if v_draft_id is null or v_draft_revision is null or v_draft_revision<1 then raise exception 'OFFICE_DRAFT_REQUIRED_FOR_SEND'; end if;

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
    if v_email is null or length(v_email)<5 or length(v_email)>320 or position('@' in v_email)<=1 or v_email~E'[\\r\\n]' then raise exception 'OFFICE_CUSTOMER_EMAIL_REQUIRED'; end if;
    if length(v_subject)<1 or length(v_subject)>300 then raise exception 'OFFICE_EMAIL_SUBJECT_REQUIRED'; end if;
  end if;

  v_cc:=private.normalize_office_email_list_v1(v_cc_raw,array[v_email],10);
  v_bcc:=private.normalize_office_email_list_v1(v_bcc_raw,array[v_email]||v_cc,10);

  -- Lock and prove the exact persisted snapshot before any thread/job side effect is created.
  select * into v_draft from public.office_drafts
  where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor and revision=v_draft_revision
  for update;
  if not found then
    perform 1 from public.office_drafts where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
    if found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;
    raise exception 'OFFICE_DRAFT_NOT_FOUND';
  end if;
  if (v_mode='reply' and (v_draft.draft_type<>'reply' or v_draft.thread_id is distinct from v_thread_id))
    or (v_mode='new_email' and (v_draft.draft_type<>'new_email' or v_draft.thread_id is not null))
    or v_draft.to_email is distinct from v_email
    or v_draft.cc_emails is distinct from v_cc
    or v_draft.bcc_emails is distinct from v_bcc
    or v_draft.subject is distinct from v_subject
    or v_draft.body is distinct from v_body
  then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;

  if v_mailbox_key is null then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;
  select exists(select 1 from public.office_mailboxes m where m.instance_id=p_instance_id and m.mailbox_key=v_mailbox_key and m.is_active=true)
    into v_mailbox_exists;
  if not v_mailbox_exists then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'; end if;

  if v_mode='new_email' then
    insert into public.office_threads(instance_id,subject,customer_email,status,priority,created_by,assigned_to,conversation_type,mailbox_key,updated_at)
    values(p_instance_id,v_subject,v_email,'open','normal',p_actor,p_actor,'customer',v_mailbox_key,now()) returning * into v_thread;
    v_thread_id:=v_thread.id;
  end if;

  select exists(select 1 from public.office_thread_email_routes r where r.instance_id=p_instance_id and r.thread_id=v_thread_id)
    into v_route_exists;
  if not v_route_exists then raise exception 'OFFICE_EMAIL_ROUTE_MISSING'; end if;

  if v_thread.order_id is not null then
    select order_number into v_order_number from public.orders where id=v_thread.order_id and instance_id=p_instance_id;
    if not found then raise exception 'OFFICE_ORDER_NOT_FOUND'; end if;
  end if;

  v_job:=public.enqueue_communication_v2(
    p_instance_id,v_email,null,'transactional','support_reply',
    jsonb_build_object(
      'name','Vásárlónk','ticketId',v_thread_id,'ticketNumber',coalesce(v_order_number,v_thread.subject),
      'replyPreview',v_body,'orderNumber',v_order_number,'officeThreadId',v_thread_id,'emailSubject',v_subject,
      'emailCc',to_jsonb(v_cc),'emailBcc',to_jsonb(v_bcc)
    ),v_idempotency_key,now()
  );
  if v_job is null then raise exception 'OFFICE_COMMUNICATION_JOB_MISSING'; end if;

  insert into public.office_messages(instance_id,thread_id,author_id,kind,body,communication_job_id,recipient_email,subject,cc_emails,bcc_emails)
  values(p_instance_id,v_thread_id,p_actor,'email_out',v_body,v_job,v_email,v_subject,v_cc,v_bcc)
  returning id into v_message_id;

  update public.office_threads set updated_at=now() where id=v_thread_id and instance_id=p_instance_id;
  if not found then raise exception 'OFFICE_THREAD_UPDATE_MISSING'; end if;

  insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
  values(p_instance_id,v_thread_id,p_actor,now(),p_actor)
  on conflict(instance_id,thread_id,user_id) do update set last_read_at=now(),left_at=null,updated_at=now();

  delete from public.office_drafts
  where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor and revision=v_draft_revision;
  if not found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(
    p_actor,case when v_mode='new_email' then 'office.new_email_queued_v4' else 'office.customer_email_queued_v4' end,
    'office_thread',v_thread_id::text,v_org,p_instance_id,
    case when v_mode='new_email' then 'Digitális Iroda új ügyfél-e-mail sorba állítva' else 'Digitális Iroda ügyfélválasz sorba állítva' end,
    jsonb_build_object('threadId',v_thread_id,'communicationJobId',v_job,'messageId',v_message_id,'mailboxKey',v_mailbox_key,'recipient',v_email,'ccCount',cardinality(v_cc),'bccCount',cardinality(v_bcc),'subjectLength',length(v_subject),'bodyLength',length(v_body),'draftRevision',v_draft_revision),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_queue_office_email_v4')
  );

  return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id,'jobId',v_job,'mailboxKey',v_mailbox_key,'ccCount',cardinality(v_cc),'bccCount',cardinality(v_bcc));
end;
$$;

revoke all on function public.admin_queue_office_email_v4(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_queue_office_email_v4(uuid,uuid,jsonb) to service_role;

comment on table public.office_attachments is 'Service-only metadata foundation for future private Digital Office attachments. This migration creates no storage bucket and enables no binary upload path.';
comment on function public.admin_queue_office_email_v4(uuid,uuid,jsonb)
is 'Atomically validates persisted draft revision + exact To/CC/BCC/subject/body snapshot before queuing one Digital Office email. Requires an explicitly active dedicated Office mailbox.';
