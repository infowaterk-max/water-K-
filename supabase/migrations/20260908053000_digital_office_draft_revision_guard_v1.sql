-- Digital Office draft autosave concurrency foundation.
-- Adds optimistic revision control without changing mailbox/send activation.

alter table public.office_drafts
  add column if not exists revision bigint not null default 1;

alter table public.office_drafts
  drop constraint if exists office_drafts_revision_positive_check;
alter table public.office_drafts
  add constraint office_drafts_revision_positive_check check (revision>0);

create or replace function public.admin_mutate_office_draft_v2(
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
  v_expected_revision bigint;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_DRAFT_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_DRAFT_PAYLOAD_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='save' then
    v_draft_id:=case when nullif(trim(coalesce(p_payload->>'draftId','')),'') is null then null else (p_payload->>'draftId')::uuid end;
    v_expected_revision:=case when nullif(trim(coalesce(p_payload->>'expectedRevision','')),'') is null then null else (p_payload->>'expectedRevision')::bigint end;
    v_draft_type:=trim(coalesce(p_payload->>'draftType',''));
    v_thread_id:=case when nullif(trim(coalesce(p_payload->>'threadId','')),'') is null then null else (p_payload->>'threadId')::uuid end;
    v_to_email:=nullif(lower(trim(coalesce(p_payload->>'toEmail',''))),'');
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=coalesce(p_payload->>'body','');

    if v_draft_type not in ('new_email','reply') or length(v_subject)>300 or length(v_body)>10000 then raise exception 'OFFICE_DRAFT_INVALID'; end if;
    if v_to_email is not null and (length(v_to_email)<5 or length(v_to_email)>320 or position('@' in v_to_email)=0) then raise exception 'OFFICE_DRAFT_EMAIL_INVALID'; end if;
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

    if v_draft_id is null then
      insert into public.office_drafts(instance_id,author_user_id,thread_id,draft_type,to_email,subject,body,revision)
      values(p_instance_id,p_actor,v_thread_id,v_draft_type,v_to_email,v_subject,v_body,1)
      returning * into v_draft;
    else
      update public.office_drafts
      set thread_id=v_thread_id,
          draft_type=v_draft_type,
          to_email=v_to_email,
          subject=v_subject,
          body=v_body,
          revision=revision+1,
          updated_at=now()
      where id=v_draft_id
        and instance_id=p_instance_id
        and author_user_id=p_actor
        and revision=v_expected_revision
      returning * into v_draft;
      if not found then
        perform 1 from public.office_drafts
        where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
        if found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;
        raise exception 'OFFICE_DRAFT_NOT_FOUND';
      end if;
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.draft_saved','office_draft',v_draft.id::text,v_org,p_instance_id,
      case when v_draft.draft_type='reply' then 'Digitális Iroda válaszpiszkozat mentve' else 'Digitális Iroda új e-mail piszkozat mentve' end,
      jsonb_build_object(
        'draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,
        'hasRecipient',v_draft.to_email is not null,'subjectLength',length(v_draft.subject),
        'bodyLength',length(v_draft.body),'revision',v_draft.revision
      ),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v2')
    );

    return jsonb_build_object(
      'id',v_draft.id,'draftId',v_draft.id,'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,
      'revision',v_draft.revision,'updatedAt',v_draft.updated_at
    );
  end if;

  if p_action='delete' then
    v_draft_id:=(p_payload->>'draftId')::uuid;
    v_expected_revision:=case when nullif(trim(coalesce(p_payload->>'expectedRevision','')),'') is null then null else (p_payload->>'expectedRevision')::bigint end;
    if v_expected_revision is null or v_expected_revision<1 then raise exception 'OFFICE_DRAFT_REVISION_REQUIRED'; end if;

    delete from public.office_drafts
    where id=v_draft_id
      and instance_id=p_instance_id
      and author_user_id=p_actor
      and revision=v_expected_revision
    returning * into v_draft;
    if not found then
      perform 1 from public.office_drafts
      where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor;
      if found then raise exception 'OFFICE_DRAFT_CONFLICT'; end if;
      raise exception 'OFFICE_DRAFT_NOT_FOUND';
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,metadata
    ) values(
      p_actor,'office.draft_deleted','office_draft',v_draft.id::text,v_org,p_instance_id,
      'Digitális Iroda piszkozat törölve',
      jsonb_build_object(
        'draftType',v_draft.draft_type,'threadId',v_draft.thread_id,'subjectLength',length(v_draft.subject),
        'bodyLength',length(v_draft.body),'revision',v_draft.revision
      ),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_draft_v2')
    );

    return jsonb_build_object('id',v_draft.id,'draftId',v_draft.id,'deleted',true,'revision',v_draft.revision);
  end if;

  raise exception 'OFFICE_DRAFT_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_office_draft_v2(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate_office_draft_v2(uuid,uuid,text,jsonb) to service_role;

comment on function public.admin_mutate_office_draft_v2(uuid,uuid,text,jsonb)
is 'Author-private Digital Office draft mutation with optimistic revision control for autosave and multi-device conflict prevention.';
