-- Roadmap Block 9 — Communication Hub 2.0 foundation.
-- Extends the existing Digital Office / Team Chat / delegation / private attachment engines.
-- No mailbox, DNS, MX, provider receiving or public storage activation is performed here.

alter table public.office_mailboxes
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null;

alter table public.office_threads
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_ref text,
  add column if not exists sales_owner_user_id uuid references auth.users(id) on delete set null;

alter table public.office_threads drop constraint if exists office_threads_customer_ref_check;
alter table public.office_threads add constraint office_threads_customer_ref_check
  check(customer_ref is null or length(trim(customer_ref)) between 1 and 200);

alter table public.office_messages
  add column if not exists acting_for_user_id uuid references auth.users(id) on delete set null,
  add column if not exists delegation_id uuid references public.store_delegations(id) on delete set null;

create index if not exists office_mailboxes_responsible_idx
  on public.office_mailboxes(instance_id,responsible_user_id)
  where responsible_user_id is not null;
create index if not exists office_threads_customer_user_idx
  on public.office_threads(instance_id,customer_user_id)
  where customer_user_id is not null;
create index if not exists office_threads_customer_ref_idx
  on public.office_threads(instance_id,customer_ref)
  where customer_ref is not null;
create index if not exists office_threads_sales_owner_idx
  on public.office_threads(instance_id,sales_owner_user_id)
  where sales_owner_user_id is not null;

create or replace function private.office_active_member_v1(p_instance_id uuid,p_user_id uuid)
returns boolean
language sql
stable
set search_path=''
as $$
  select exists(
    select 1
    from public.webshop_instances wi
    join public.role_bindings rb on rb.organization_id=wi.organization_id
    where wi.id=p_instance_id
      and rb.user_id=p_user_id
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.revoked_at is null
      and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
  );
$$;
revoke all on function private.office_active_member_v1(uuid,uuid) from public,anon,authenticated;

create or replace function public.admin_update_office_mailbox_responsibility_v1(
  p_instance_id uuid,p_actor uuid,p_mailbox_key text,p_responsible_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_key text:=lower(trim(coalesce(p_mailbox_key,'')));
begin
  if p_instance_id is null or p_actor is null or v_key='' then raise exception 'OFFICE_MAILBOX_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  if p_responsible_user_id is not null and not private.office_active_member_v1(p_instance_id,p_responsible_user_id) then
    raise exception 'OFFICE_MAILBOX_RESPONSIBLE_ACTIVE_MEMBER_REQUIRED';
  end if;
  update public.office_mailboxes
  set responsible_user_id=p_responsible_user_id,updated_at=now()
  where instance_id=p_instance_id and mailbox_key=v_key;
  if not found then raise exception 'OFFICE_MAILBOX_NOT_FOUND'; end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'office.mailbox_responsibility_updated','office_mailbox',v_key,v_org,p_instance_id,
    'Digitális Iroda postafiók felelőse frissítve',
    jsonb_build_object('mailboxKey',v_key,'responsibleUserId',p_responsible_user_id),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_update_office_mailbox_responsibility_v1'));
  return jsonb_build_object('id',v_key,'mailboxKey',v_key,'responsibleUserId',p_responsible_user_id);
end;
$$;
revoke all on function public.admin_update_office_mailbox_responsibility_v1(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_office_mailbox_responsibility_v1(uuid,uuid,text,uuid) to service_role;

create or replace function public.admin_update_office_thread_relationships_v1(
  p_instance_id uuid,p_actor uuid,p_thread_id uuid,p_customer_user_id uuid,p_customer_ref text,p_sales_owner_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread public.office_threads%rowtype;
  v_customer_ref text:=nullif(trim(coalesce(p_customer_ref,'')),'');
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null then raise exception 'OFFICE_THREAD_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_thread from public.office_threads
    where id=p_thread_id and instance_id=p_instance_id and conversation_type='customer' for update;
  if not found or not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;
  if v_customer_ref is not null and length(v_customer_ref)>200 then raise exception 'OFFICE_CUSTOMER_REF_INVALID'; end if;
  if p_customer_user_id is not null and not exists(
    select 1 from public.orders o where o.instance_id=p_instance_id and o.customer_id=p_customer_user_id
    union all
    select 1 from public.customer_journeys j where j.instance_id=p_instance_id and j.customer_id=p_customer_user_id::text
    limit 1
  ) then raise exception 'OFFICE_CUSTOMER_USER_NOT_IN_INSTANCE'; end if;
  if v_customer_ref is not null and not exists(
    select 1 from public.customer_value_profiles p where p.instance_id=p_instance_id and p.customer_id=v_customer_ref
    union all select 1 from public.customer_journeys j where j.instance_id=p_instance_id and j.customer_id=v_customer_ref
    union all select 1 from public.commercial_opportunities o where o.instance_id=p_instance_id and o.customer_id=v_customer_ref
    union all select 1 from public.commercial_offers f where f.instance_id=p_instance_id and f.customer_id=v_customer_ref
    limit 1
  ) then raise exception 'OFFICE_CUSTOMER_REF_NOT_IN_INSTANCE'; end if;
  if p_sales_owner_user_id is not null and not private.office_active_member_v1(p_instance_id,p_sales_owner_user_id) then
    raise exception 'OFFICE_SALES_OWNER_ACTIVE_MEMBER_REQUIRED';
  end if;
  update public.office_threads
    set customer_user_id=p_customer_user_id,customer_ref=v_customer_ref,sales_owner_user_id=p_sales_owner_user_id,updated_at=now()
    where id=p_thread_id and instance_id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'office.thread_relationships_updated','office_thread',p_thread_id::text,v_org,p_instance_id,
    'Digitális Iroda ügyfél- és sales-kapcsolatai frissítve',
    jsonb_build_object('threadId',p_thread_id,'customerUserId',p_customer_user_id,'customerRef',v_customer_ref,'salesOwnerUserId',p_sales_owner_user_id),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_update_office_thread_relationships_v1'));
  return jsonb_build_object('id',p_thread_id,'threadId',p_thread_id,'customerUserId',p_customer_user_id,'customerRef',v_customer_ref,'salesOwnerUserId',p_sales_owner_user_id);
end;
$$;
revoke all on function public.admin_update_office_thread_relationships_v1(uuid,uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_office_thread_relationships_v1(uuid,uuid,uuid,uuid,text,uuid) to service_role;

create or replace function private.office_message_delegation_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_thread public.office_threads%rowtype;
  v_delegation public.store_delegations%rowtype;
begin
  if new.acting_for_user_id is null and new.delegation_id is null then return new; end if;
  if new.kind<>'email_out' or new.author_id is null or new.acting_for_user_id is null or new.delegation_id is null then
    raise exception 'OFFICE_MESSAGE_DELEGATION_EVIDENCE_REQUIRED';
  end if;
  select * into v_thread from public.office_threads where id=new.thread_id and instance_id=new.instance_id;
  if not found or v_thread.conversation_type<>'customer' then raise exception 'OFFICE_MESSAGE_DELEGATION_CUSTOMER_THREAD_REQUIRED'; end if;
  select * into v_delegation from public.store_delegations
    where id=new.delegation_id and instance_id=new.instance_id
      and source_user_id=new.acting_for_user_id and delegate_user_id=new.author_id
      and revoked_at is null and valid_from<=new.created_at and valid_until>new.created_at;
  if not found then raise exception 'OFFICE_MESSAGE_DELEGATION_INVALID'; end if;
  if not exists(
    select 1 from public.store_delegation_permissions dp
    where dp.delegation_id=v_delegation.id and dp.permission_code in('office.thread.reply','office.email.compose')
  ) then raise exception 'OFFICE_MESSAGE_DELEGATION_PERMISSION_REQUIRED'; end if;
  if v_delegation.scope_type='mailbox' and v_delegation.scope_value is distinct from v_thread.mailbox_key then
    raise exception 'OFFICE_MESSAGE_DELEGATION_SCOPE_MISMATCH';
  end if;
  if v_delegation.scope_type='topic' and v_delegation.scope_value is distinct from v_thread.topic_code then
    raise exception 'OFFICE_MESSAGE_DELEGATION_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function private.office_message_delegation_integrity_v1() from public,anon,authenticated;
drop trigger if exists office_message_delegation_integrity_v1 on public.office_messages;
create trigger office_message_delegation_integrity_v1
before insert or update of author_id,acting_for_user_id,delegation_id,thread_id,instance_id,kind on public.office_messages
for each row execute function private.office_message_delegation_integrity_v1();

alter table public.office_message_attachments
  alter column uploader_id drop not null,
  alter column thread_id drop not null,
  add column if not exists source text not null default 'internal_upload',
  add column if not exists draft_reservation_id uuid,
  add column if not exists provider_email_id text,
  add column if not exists provider_attachment_id text;

alter table public.office_message_attachments drop constraint if exists office_message_attachments_source_check;
alter table public.office_message_attachments add constraint office_message_attachments_source_check
  check(source in('internal_upload','provider_inbound','customer_outbound'));
alter table public.office_message_attachments drop constraint if exists office_message_attachments_provider_evidence_check;
alter table public.office_message_attachments add constraint office_message_attachments_provider_evidence_check
  check(
    (source='provider_inbound' and uploader_id is null and provider_email_id is not null and provider_attachment_id is not null and draft_reservation_id is null)
    or (source='internal_upload' and uploader_id is not null and provider_email_id is null and provider_attachment_id is null and draft_reservation_id is null)
    or (source='customer_outbound' and uploader_id is not null and provider_email_id is null and provider_attachment_id is null and draft_reservation_id is not null)
  );
create unique index if not exists office_message_attachments_provider_unique
  on public.office_message_attachments(instance_id,provider_email_id,provider_attachment_id)
  where source='provider_inbound';
create index if not exists office_message_attachments_draft_reservation_idx
  on public.office_message_attachments(instance_id,draft_reservation_id,uploader_id)
  where source='customer_outbound' and status='pending';

create or replace function private.office_attachment_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_thread_type text;
  v_message_thread uuid;
  v_message_instance uuid;
  v_message_kind text;
  v_expected_prefix text;
begin
  if new.source='internal_upload' then
    if new.thread_id is null then raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'; end if;
    select conversation_type into v_thread_type from public.office_threads where id=new.thread_id and instance_id=new.instance_id;
    if v_thread_type not in('internal_private','internal_group') then raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'; end if;
    v_expected_prefix:=new.instance_id::text||'/'||new.thread_id::text||'/'||new.id::text;
  elsif new.source='provider_inbound' then
    if new.thread_id is null then raise exception 'OFFICE_ATTACHMENT_CUSTOMER_THREAD_REQUIRED'; end if;
    select conversation_type into v_thread_type from public.office_threads where id=new.thread_id and instance_id=new.instance_id;
    if v_thread_type<>'customer' then raise exception 'OFFICE_ATTACHMENT_CUSTOMER_THREAD_REQUIRED'; end if;
    v_expected_prefix:=new.instance_id::text||'/'||new.thread_id::text||'/'||new.id::text;
  elsif new.source='customer_outbound' then
    if new.status='ready' and new.thread_id is null then raise exception 'OFFICE_ATTACHMENT_CUSTOMER_THREAD_REQUIRED'; end if;
    if new.thread_id is not null then
      select conversation_type into v_thread_type from public.office_threads where id=new.thread_id and instance_id=new.instance_id;
      if v_thread_type<>'customer' then raise exception 'OFFICE_ATTACHMENT_CUSTOMER_THREAD_REQUIRED'; end if;
    end if;
    v_expected_prefix:=new.instance_id::text||'/email/'||new.id::text;
  else
    raise exception 'OFFICE_ATTACHMENT_SOURCE_INVALID';
  end if;
  if new.storage_path<>v_expected_prefix then raise exception 'OFFICE_ATTACHMENT_STORAGE_PATH_INVALID'; end if;

  if new.message_id is not null then
    select thread_id,instance_id,kind into v_message_thread,v_message_instance,v_message_kind from public.office_messages where id=new.message_id;
    if v_message_instance is distinct from new.instance_id or v_message_thread is distinct from new.thread_id then
      raise exception 'OFFICE_ATTACHMENT_MESSAGE_SCOPE_INVALID';
    end if;
    if (new.source='internal_upload' and v_message_kind<>'internal')
      or (new.source='provider_inbound' and v_message_kind<>'email_in')
      or (new.source='customer_outbound' and v_message_kind<>'email_out') then
      raise exception 'OFFICE_ATTACHMENT_MESSAGE_KIND_INVALID';
    end if;
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
revoke all on function private.office_attachment_integrity_v1() from public,anon,authenticated;

create or replace function public.service_prepare_inbound_office_attachments_v1(
  p_instance_id uuid,p_thread_id uuid,p_message_id uuid,p_provider_email_id text,p_files jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_file jsonb;v_id uuid;v_name text;v_type text;v_size bigint;v_provider_attachment_id text;v_path text;v_items jsonb:='[]'::jsonb;v_count integer;v_message_kind text;
begin
  if p_instance_id is null or p_thread_id is null or p_message_id is null or nullif(trim(coalesce(p_provider_email_id,'')),'') is null then raise exception 'OFFICE_INBOUND_ATTACHMENT_IDENTITY_REQUIRED'; end if;
  select kind into v_message_kind from public.office_messages where id=p_message_id and instance_id=p_instance_id and thread_id=p_thread_id;
  if v_message_kind<>'email_in' then raise exception 'OFFICE_INBOUND_ATTACHMENT_MESSAGE_REQUIRED'; end if;
  if jsonb_typeof(p_files)<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  v_count:=jsonb_array_length(p_files);
  if v_count<1 or v_count>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;
  for v_file in select value from jsonb_array_elements(p_files) loop
    v_provider_attachment_id:=nullif(trim(coalesce(v_file->>'providerAttachmentId','')),'');
    v_name:=trim(coalesce(v_file->>'name',''));
    v_type:=lower(trim(coalesce(v_file->>'contentType','')));
    begin v_size:=(v_file->>'size')::bigint; exception when others then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end;
    if v_provider_attachment_id is null or length(v_provider_attachment_id)>500 then raise exception 'OFFICE_PROVIDER_ATTACHMENT_ID_INVALID'; end if;
    if length(v_name)<1 or length(v_name)>240 or position('/' in v_name)>0 or position(E'\\' in v_name)>0 then raise exception 'OFFICE_ATTACHMENT_NAME_INVALID'; end if;
    if v_type not in('image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'OFFICE_ATTACHMENT_TYPE_INVALID'; end if;
    if v_size<1 or v_size>10485760 then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end if;
    v_id:=gen_random_uuid();v_path:=p_instance_id::text||'/'||p_thread_id::text||'/'||v_id::text;
    insert into public.office_message_attachments(id,instance_id,thread_id,message_id,uploader_id,storage_path,original_name,content_type,byte_size,status,expires_at,source,provider_email_id,provider_attachment_id)
    values(v_id,p_instance_id,p_thread_id,null,null,v_path,v_name,v_type,v_size,'pending',now()+interval '24 hours','provider_inbound',p_provider_email_id,v_provider_attachment_id)
    on conflict(instance_id,provider_email_id,provider_attachment_id) where source='provider_inbound' do nothing;
    if found then v_items:=v_items||jsonb_build_array(jsonb_build_object('attachmentId',v_id,'path',v_path,'name',v_name,'contentType',v_type,'size',v_size)); end if;
  end loop;
  return jsonb_build_object('id',p_message_id,'messageId',p_message_id,'threadId',p_thread_id,'attachments',v_items);
end;
$$;
revoke all on function public.service_prepare_inbound_office_attachments_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.service_prepare_inbound_office_attachments_v1(uuid,uuid,uuid,text,jsonb) to service_role;

create or replace function public.service_begin_inbound_office_attachment_scan_v1(p_instance_id uuid,p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_attachment public.office_message_attachments%rowtype;v_storage_count integer;v_nonce uuid:=gen_random_uuid();
begin
  select * into v_attachment from public.office_message_attachments
  where id=p_attachment_id and instance_id=p_instance_id and source='provider_inbound' and status='pending' and expires_at>now() and scan_status in('awaiting_upload','scan_error') for update;
  if not found then raise exception 'OFFICE_INBOUND_ATTACHMENT_SCAN_RESERVATION_INVALID'; end if;
  select count(*) into v_storage_count from storage.objects where bucket_id=v_attachment.storage_bucket and name=v_attachment.storage_path;
  if v_storage_count<>1 then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;
  update public.office_message_attachments set scan_status='pending_scan',scan_nonce=v_nonce,scan_attempts=scan_attempts+1,quarantine_reason=null,scan_provider=null,scan_engine_version=null,malware_signature=null,scan_completed_at=null,updated_at=now() where id=v_attachment.id;
  insert into public.office_attachment_security_events(instance_id,attachment_id,event_type,metadata)
  values(p_instance_id,v_attachment.id,'scan_started',jsonb_build_object('threadId',v_attachment.thread_id,'source','provider_inbound','scanAttempt',v_attachment.scan_attempts+1));
  return jsonb_build_object('id',v_attachment.id,'attachmentId',v_attachment.id,'threadId',v_attachment.thread_id,'storageBucket',v_attachment.storage_bucket,'storagePath',v_attachment.storage_path,'originalName',v_attachment.original_name,'declaredContentType',v_attachment.content_type,'byteSize',v_attachment.byte_size,'scanNonce',v_nonce);
end;
$$;
revoke all on function public.service_begin_inbound_office_attachment_scan_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_begin_inbound_office_attachment_scan_v1(uuid,uuid) to service_role;

create or replace function public.service_finalize_inbound_office_attachment_v1(p_instance_id uuid,p_attachment_id uuid,p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_attachment public.office_message_attachments%rowtype;v_kind text;v_thread uuid;
begin
  select * into v_attachment from public.office_message_attachments where id=p_attachment_id and instance_id=p_instance_id and source='provider_inbound' and status='pending' and scan_status='clean' for update;
  if not found then raise exception 'OFFICE_INBOUND_ATTACHMENT_CLEAN_EVIDENCE_REQUIRED'; end if;
  select kind,thread_id into v_kind,v_thread from public.office_messages where id=p_message_id and instance_id=p_instance_id;
  if v_kind<>'email_in' or v_thread is distinct from v_attachment.thread_id then raise exception 'OFFICE_INBOUND_ATTACHMENT_MESSAGE_SCOPE_INVALID'; end if;
  update public.office_message_attachments set message_id=p_message_id,status='ready',expires_at=null,finalized_at=now(),updated_at=now() where id=v_attachment.id;
  if not found then raise exception 'OFFICE_INBOUND_ATTACHMENT_FINALIZE_EVIDENCE_MISSING'; end if;
  return jsonb_build_object('id',v_attachment.id,'attachmentId',v_attachment.id,'messageId',p_message_id,'threadId',v_thread,'ready',true);
end;
$$;
revoke all on function public.service_finalize_inbound_office_attachment_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_finalize_inbound_office_attachment_v1(uuid,uuid,uuid) to service_role;

create or replace function public.admin_prepare_office_email_attachments_v1(
  p_instance_id uuid,p_actor uuid,p_draft_id uuid,p_files jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_draft public.office_drafts%rowtype;v_file jsonb;v_id uuid;v_name text;v_type text;v_size bigint;v_path text;v_items jsonb:='[]'::jsonb;v_count integer;v_org uuid;
begin
  if p_instance_id is null or p_actor is null or p_draft_id is null then raise exception 'OFFICE_EMAIL_ATTACHMENT_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_draft from public.office_drafts where id=p_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
  if not found then raise exception 'OFFICE_DRAFT_NOT_FOUND'; end if;
  if v_draft.draft_type='reply' and (v_draft.thread_id is null or not public.can_read_office_thread_v1(p_instance_id,v_draft.thread_id,p_actor)) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;
  if jsonb_typeof(p_files)<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  v_count:=jsonb_array_length(p_files);if v_count<1 or v_count>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;
  for v_file in select value from jsonb_array_elements(p_files) loop
    v_name:=trim(coalesce(v_file->>'name',''));v_type:=lower(trim(coalesce(v_file->>'contentType','')));
    begin v_size:=(v_file->>'size')::bigint; exception when others then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end;
    if length(v_name)<1 or length(v_name)>240 or position('/' in v_name)>0 or position(E'\\' in v_name)>0 then raise exception 'OFFICE_ATTACHMENT_NAME_INVALID'; end if;
    if v_type not in('image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'OFFICE_ATTACHMENT_TYPE_INVALID'; end if;
    if v_size<1 or v_size>10485760 then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end if;
    v_id:=gen_random_uuid();v_path:=p_instance_id::text||'/email/'||v_id::text;
    insert into public.office_message_attachments(id,instance_id,thread_id,uploader_id,storage_path,original_name,content_type,byte_size,status,expires_at,source,draft_reservation_id)
    values(v_id,p_instance_id,v_draft.thread_id,p_actor,v_path,v_name,v_type,v_size,'pending',now()+interval '2 hours','customer_outbound',p_draft_id);
    v_items:=v_items||jsonb_build_array(jsonb_build_object('attachmentId',v_id,'path',v_path,'name',v_name,'contentType',v_type,'size',v_size,'expiresAt',now()+interval '2 hours'));
  end loop;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'office.email_attachments_prepared','office_draft',p_draft_id::text,v_org,p_instance_id,'Ügyfél-e-mail csatolmányok előkészítve',jsonb_build_object('draftId',p_draft_id,'attachmentCount',v_count),jsonb_build_object('audit_source','database_rpc','rpc','admin_prepare_office_email_attachments_v1'));
  return jsonb_build_object('id',p_draft_id,'draftId',p_draft_id,'threadId',v_draft.thread_id,'attachments',v_items);
end;
$$;
revoke all on function public.admin_prepare_office_email_attachments_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_prepare_office_email_attachments_v1(uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.admin_begin_office_email_attachment_scan_v1(p_instance_id uuid,p_actor uuid,p_draft_id uuid,p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_attachment public.office_message_attachments%rowtype;v_storage_count integer;v_nonce uuid:=gen_random_uuid();
begin
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;
  select * into v_attachment from public.office_message_attachments
    where id=p_attachment_id and instance_id=p_instance_id and uploader_id=p_actor and source='customer_outbound' and draft_reservation_id=p_draft_id and status='pending' and expires_at>now() and scan_status in('awaiting_upload','scan_error') for update;
  if not found then raise exception 'OFFICE_EMAIL_ATTACHMENT_SCAN_RESERVATION_INVALID'; end if;
  select count(*) into v_storage_count from storage.objects where bucket_id=v_attachment.storage_bucket and name=v_attachment.storage_path;
  if v_storage_count<>1 then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;
  update public.office_message_attachments set scan_status='pending_scan',scan_nonce=v_nonce,scan_attempts=scan_attempts+1,quarantine_reason=null,scan_provider=null,scan_engine_version=null,malware_signature=null,scan_completed_at=null,updated_at=now() where id=v_attachment.id;
  insert into public.office_attachment_security_events(instance_id,attachment_id,event_type,metadata)
  values(p_instance_id,v_attachment.id,'scan_started',jsonb_build_object('draftId',p_draft_id,'source','customer_outbound','uploaderId',p_actor,'scanAttempt',v_attachment.scan_attempts+1));
  return jsonb_build_object('id',v_attachment.id,'attachmentId',v_attachment.id,'threadId',v_attachment.thread_id,'storageBucket',v_attachment.storage_bucket,'storagePath',v_attachment.storage_path,'originalName',v_attachment.original_name,'declaredContentType',v_attachment.content_type,'byteSize',v_attachment.byte_size,'scanNonce',v_nonce);
end;
$$;
revoke all on function public.admin_begin_office_email_attachment_scan_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_begin_office_email_attachment_scan_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.admin_queue_office_email_v5(p_instance_id uuid,p_actor uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_draft_id uuid;v_attachment_ids uuid[]:='{}'::uuid[];v_attachment_id uuid;v_attachment public.office_message_attachments%rowtype;v_count integer;v_result jsonb;v_message_id uuid;v_thread_id uuid;v_job_id uuid;v_updated integer;v_acting_for uuid;v_delegation uuid;v_mode text;v_thread public.office_threads%rowtype;v_org uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
  v_draft_id:=case when nullif(trim(coalesce(p_payload->>'draftId','')),'') is null then null else (p_payload->>'draftId')::uuid end;
  if v_draft_id is null then raise exception 'OFFICE_DRAFT_REQUIRED_FOR_SEND'; end if;
  if p_payload?'attachmentIds' and jsonb_typeof(p_payload->'attachmentIds')<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  if coalesce(jsonb_array_length(coalesce(p_payload->'attachmentIds','[]'::jsonb)),0)>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;
  select coalesce(array_agg(distinct value::text::uuid),'{}'::uuid[]) into v_attachment_ids from jsonb_array_elements_text(coalesce(p_payload->'attachmentIds','[]'::jsonb));
  v_count:=coalesce(cardinality(v_attachment_ids),0);
  if v_count<>coalesce(jsonb_array_length(coalesce(p_payload->'attachmentIds','[]'::jsonb)),0) then raise exception 'OFFICE_ATTACHMENT_DUPLICATE'; end if;
  foreach v_attachment_id in array v_attachment_ids loop
    select * into v_attachment from public.office_message_attachments
      where id=v_attachment_id and instance_id=p_instance_id and uploader_id=p_actor and source='customer_outbound' and draft_reservation_id=v_draft_id and status='pending' and expires_at>now() and scan_status='clean' for update;
    if not found then raise exception 'OFFICE_EMAIL_ATTACHMENT_CLEAN_EVIDENCE_REQUIRED'; end if;
    if not exists(select 1 from storage.objects where bucket_id=v_attachment.storage_bucket and name=v_attachment.storage_path) then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;
  end loop;

  v_result:=public.admin_queue_office_email_v4(p_instance_id,p_actor,p_payload);
  v_message_id:=(v_result->>'messageId')::uuid;v_thread_id:=(v_result->>'threadId')::uuid;v_job_id:=(v_result->>'jobId')::uuid;
  if v_message_id is null or v_thread_id is null or v_job_id is null then raise exception 'OFFICE_EMAIL_EVIDENCE_MISSING'; end if;

  if v_count>0 then
    update public.office_message_attachments set thread_id=v_thread_id,message_id=v_message_id,status='ready',expires_at=null,finalized_at=now(),updated_at=now()
    where id=any(v_attachment_ids) and instance_id=p_instance_id and uploader_id=p_actor and source='customer_outbound' and draft_reservation_id=v_draft_id and status='pending' and scan_status='clean';
    get diagnostics v_updated=row_count;if v_updated<>v_count then raise exception 'OFFICE_EMAIL_ATTACHMENT_FINALIZE_EVIDENCE_MISSING'; end if;
    update public.office_messages set attachment_count=v_count where id=v_message_id and instance_id=p_instance_id and thread_id=v_thread_id;
  end if;

  v_acting_for:=case when nullif(trim(coalesce(p_payload->>'actingForUserId','')),'') is null then null else (p_payload->>'actingForUserId')::uuid end;
  if v_acting_for is not null and v_acting_for<>p_actor then
    v_mode:=trim(coalesce(p_payload->>'mode',''));
    select * into v_thread from public.office_threads where id=v_thread_id and instance_id=p_instance_id;
    select d.id into v_delegation from public.store_delegations d
      join public.store_delegation_permissions dp on dp.delegation_id=d.id
      where d.instance_id=p_instance_id and d.source_user_id=v_acting_for and d.delegate_user_id=p_actor
        and d.revoked_at is null and d.valid_from<=now() and d.valid_until>now()
        and dp.permission_code=case when v_mode='reply' then 'office.thread.reply' else 'office.email.compose' end
        and (d.scope_type='all' or (d.scope_type='mailbox' and d.scope_value=v_thread.mailbox_key) or (d.scope_type='topic' and d.scope_value=v_thread.topic_code))
      order by d.valid_until asc limit 1;
    if v_delegation is null then raise exception 'OFFICE_EMAIL_ACTIVE_DELEGATION_REQUIRED'; end if;
    update public.office_messages set acting_for_user_id=v_acting_for,delegation_id=v_delegation where id=v_message_id and instance_id=p_instance_id;
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'office.customer_email_queued_v5','office_message',v_message_id::text,v_org,p_instance_id,'Communication Hub 2.0 ügyfél-e-mail sorba állítva',jsonb_build_object('threadId',v_thread_id,'messageId',v_message_id,'jobId',v_job_id,'attachmentCount',v_count,'actingForUserId',case when v_acting_for=p_actor then null else v_acting_for end,'delegationId',v_delegation),jsonb_build_object('audit_source','database_rpc','rpc','admin_queue_office_email_v5'));
  return v_result||jsonb_build_object('attachmentCount',v_count,'actingForUserId',case when v_acting_for=p_actor then null else v_acting_for end,'delegationId',v_delegation);
end;
$$;
revoke all on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) to service_role;

comment on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) is 'Block 9 atomic Office send wrapper: exact v4 draft snapshot + clean tenant-bound customer-email attachments + immutable active delegation provenance.';
comment on function public.service_prepare_inbound_office_attachments_v1(uuid,uuid,uuid,text,jsonb) is 'Service-only registration of provider inbound email attachments into the existing office-private quarantine pipeline. No public storage path is permitted.';
