-- Digital Office private attachments: participant-protected metadata + signed Storage flow.
-- This extends Team Chat 2.0 only. No customer-email attachment behavior is activated here.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'office-private',
  'office-private',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.office_message_attachments(
  id uuid primary key,
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  thread_id uuid not null references public.office_threads(id) on delete cascade,
  message_id uuid references public.office_messages(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete restrict,
  storage_bucket text not null default 'office-private' check(storage_bucket='office-private'),
  storage_path text not null unique,
  original_name text not null check(length(original_name) between 1 and 240),
  content_type text not null check(content_type in(
    'image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  byte_size bigint not null check(byte_size between 1 and 10485760),
  status text not null default 'pending' check(status in('pending','ready','revoked')),
  expires_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(
    (status='pending' and message_id is null and expires_at is not null and finalized_at is null)
    or (status='ready' and message_id is not null and expires_at is null and finalized_at is not null)
    or status='revoked'
  )
);

create index if not exists office_message_attachments_thread_idx
  on public.office_message_attachments(instance_id,thread_id,created_at desc);
create index if not exists office_message_attachments_message_idx
  on public.office_message_attachments(instance_id,message_id)
  where status='ready';
create index if not exists office_message_attachments_pending_idx
  on public.office_message_attachments(expires_at)
  where status='pending';

alter table public.office_message_attachments enable row level security;
revoke all on table public.office_message_attachments from public,anon,authenticated;
grant select,insert,update,delete on table public.office_message_attachments to service_role;

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
  select conversation_type into v_thread_type
    from public.office_threads
    where id=new.thread_id and instance_id=new.instance_id;
  if v_thread_type not in('internal_private','internal_group') then
    raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED';
  end if;

  v_expected_prefix:=new.instance_id::text||'/'||new.thread_id::text||'/'||new.id::text;
  if new.storage_path<>v_expected_prefix then
    raise exception 'OFFICE_ATTACHMENT_STORAGE_PATH_INVALID';
  end if;

  if new.message_id is not null then
    select thread_id,instance_id,kind into v_message_thread,v_message_instance,v_message_kind
      from public.office_messages where id=new.message_id;
    if v_message_thread is distinct from new.thread_id
      or v_message_instance is distinct from new.instance_id
      or v_message_kind is distinct from 'internal' then
      raise exception 'OFFICE_ATTACHMENT_MESSAGE_SCOPE_INVALID';
    end if;
  end if;
  new.updated_at:=now();
  return new;
end;
$$;

revoke all on function private.office_attachment_integrity_v1() from public,anon,authenticated;

drop trigger if exists office_attachment_integrity_v1 on public.office_message_attachments;
create trigger office_attachment_integrity_v1
before insert or update on public.office_message_attachments
for each row execute function private.office_attachment_integrity_v1();

create or replace function public.admin_prepare_office_private_attachments_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid,
  p_files jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread_type text;
  v_file jsonb;
  v_id uuid;
  v_name text;
  v_type text;
  v_size bigint;
  v_path text;
  v_expires timestamptz:=now()+interval '2 hours';
  v_items jsonb:='[]'::jsonb;
  v_count integer;
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select conversation_type into v_thread_type from public.office_threads
    where id=p_thread_id and instance_id=p_instance_id;
  if v_thread_type not in('internal_private','internal_group') then raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'; end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;
  if jsonb_typeof(p_files)<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  v_count:=jsonb_array_length(p_files);
  if v_count<1 or v_count>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;

  for v_file in select value from jsonb_array_elements(p_files) loop
    if jsonb_typeof(v_file)<>'object' then raise exception 'OFFICE_ATTACHMENT_FILE_INVALID'; end if;
    v_name:=trim(coalesce(v_file->>'name',''));
    v_type:=lower(trim(coalesce(v_file->>'contentType','')));
    begin v_size:=(v_file->>'size')::bigint; exception when others then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end;
    if length(v_name)<1 or length(v_name)>240 or position('/' in v_name)>0 or position(E'\\' in v_name)>0 then
      raise exception 'OFFICE_ATTACHMENT_NAME_INVALID';
    end if;
    if v_type not in(
      'image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) then raise exception 'OFFICE_ATTACHMENT_TYPE_INVALID'; end if;
    if v_size<1 or v_size>10485760 then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end if;

    v_id:=gen_random_uuid();
    v_path:=p_instance_id::text||'/'||p_thread_id::text||'/'||v_id::text;
    insert into public.office_message_attachments(
      id,instance_id,thread_id,uploader_id,storage_path,original_name,content_type,byte_size,status,expires_at
    ) values(
      v_id,p_instance_id,p_thread_id,p_actor,v_path,v_name,v_type,v_size,'pending',v_expires
    );
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'attachmentId',v_id,'path',v_path,'name',v_name,'contentType',v_type,'size',v_size,'expiresAt',v_expires
    ));
  end loop;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,'office.private_attachment_upload_prepared','office_thread',p_thread_id::text,v_org,p_instance_id,
    'Privát irodai csatolmány-feltöltés előkészítve',
    jsonb_build_object('threadId',p_thread_id,'attachmentCount',v_count,'expiresAt',v_expires),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_prepare_office_private_attachments_v1')
  );

  return jsonb_build_object('id',p_thread_id,'threadId',p_thread_id,'attachments',v_items,'expiresAt',v_expires);
end;
$$;

create or replace function public.admin_finalize_office_private_message_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread_type text;
  v_attachment_ids uuid[]:='{}'::uuid[];
  v_attachment_id uuid;
  v_attachment public.office_message_attachments%rowtype;
  v_path text;
  v_storage_count integer:=0;
  v_message_result jsonb;
  v_message_id uuid;
  v_updated integer:=0;
  v_count integer:=0;
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_PAYLOAD_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select conversation_type into v_thread_type from public.office_threads
    where id=p_thread_id and instance_id=p_instance_id for update;
  if v_thread_type not in('internal_private','internal_group') then raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'; end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;
  if p_payload?'attachmentIds' and jsonb_typeof(p_payload->'attachmentIds')<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  if coalesce(jsonb_array_length(coalesce(p_payload->'attachmentIds','[]'::jsonb)),0)>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;

  select coalesce(array_agg(distinct value::text::uuid),'{}'::uuid[]) into v_attachment_ids
    from jsonb_array_elements_text(coalesce(p_payload->'attachmentIds','[]'::jsonb));
  v_count:=coalesce(cardinality(v_attachment_ids),0);
  if v_count<>coalesce(jsonb_array_length(coalesce(p_payload->'attachmentIds','[]'::jsonb)),0) then
    raise exception 'OFFICE_ATTACHMENT_DUPLICATE';
  end if;

  foreach v_attachment_id in array v_attachment_ids loop
    select * into v_attachment from public.office_message_attachments
      where id=v_attachment_id and instance_id=p_instance_id and thread_id=p_thread_id
        and uploader_id=p_actor and status='pending' and expires_at>now()
      for update;
    if not found then raise exception 'OFFICE_ATTACHMENT_RESERVATION_INVALID'; end if;
    select count(*) into v_storage_count from storage.objects
      where bucket_id='office-private' and name=v_attachment.storage_path;
    if v_storage_count<>1 then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;
  end loop;

  v_message_result:=public.admin_mutate_office_team_chat_v2(
    p_instance_id,p_actor,'add_internal_message',p_payload||jsonb_build_object('threadId',p_thread_id)
  );
  v_message_id:=(v_message_result->>'messageId')::uuid;
  if v_message_id is null then raise exception 'OFFICE_ATTACHMENT_MESSAGE_EVIDENCE_MISSING'; end if;

  if v_count>0 then
    update public.office_message_attachments
      set message_id=v_message_id,status='ready',expires_at=null,finalized_at=now(),updated_at=now()
      where id=any(v_attachment_ids) and instance_id=p_instance_id and thread_id=p_thread_id
        and uploader_id=p_actor and status='pending';
    get diagnostics v_updated=row_count;
    if v_updated<>v_count then raise exception 'OFFICE_ATTACHMENT_FINALIZE_EVIDENCE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.private_attachments_finalized','office_message',v_message_id::text,v_org,p_instance_id,
      'Privát irodai üzenet csatolmányai véglegesítve',
      jsonb_build_object('threadId',p_thread_id,'messageId',v_message_id,'attachmentCount',v_count),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_finalize_office_private_message_v1')
    );
  end if;

  return v_message_result||jsonb_build_object('attachmentCount',v_count);
end;
$$;

create or replace function public.admin_get_office_private_attachment_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_attachment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_attachment public.office_message_attachments%rowtype;
  v_storage_count integer;
begin
  if p_instance_id is null or p_actor is null or p_attachment_id is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_attachment from public.office_message_attachments
    where id=p_attachment_id and instance_id=p_instance_id and status='ready';
  if not found then raise exception 'OFFICE_ATTACHMENT_NOT_FOUND'; end if;
  if not public.can_read_office_thread_v1(p_instance_id,v_attachment.thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;
  select count(*) into v_storage_count from storage.objects
    where bucket_id=v_attachment.storage_bucket and name=v_attachment.storage_path;
  if v_storage_count<>1 then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,'office.private_attachment_download_authorized','office_attachment',v_attachment.id::text,v_org,p_instance_id,
    'Privát irodai csatolmány letöltése engedélyezve',
    jsonb_build_object('threadId',v_attachment.thread_id,'messageId',v_attachment.message_id,'attachmentId',v_attachment.id),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_get_office_private_attachment_v1')
  );

  return jsonb_build_object(
    'id',v_attachment.id,'threadId',v_attachment.thread_id,'messageId',v_attachment.message_id,
    'storageBucket',v_attachment.storage_bucket,'storagePath',v_attachment.storage_path,
    'originalName',v_attachment.original_name,'contentType',v_attachment.content_type,'byteSize',v_attachment.byte_size
  );
end;
$$;

revoke all on function public.admin_prepare_office_private_attachments_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.admin_finalize_office_private_message_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.admin_get_office_private_attachment_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_prepare_office_private_attachments_v1(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.admin_finalize_office_private_message_v1(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.admin_get_office_private_attachment_v1(uuid,uuid,uuid) to service_role;

comment on table public.office_message_attachments is 'Private Digital Office attachment reservations and finalized message metadata. Service runtime only; visibility follows current thread participation.';
