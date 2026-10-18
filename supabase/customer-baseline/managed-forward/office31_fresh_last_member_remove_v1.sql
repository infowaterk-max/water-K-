-- F6 Office Fresh Install: preserve conversation when the last non-owner member is removed.
-- The thread stays private and owned by the remaining participant; participant RLS
-- continues to deny the removed user. Creation still requires >=2 members.
-- Exact original function pinned by PostgreSQL pg_get_functiondef MD5.
DO $office31_pre$
BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 4
 OR NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018113500' AND name='shoperation_managed_0046_current_state')
 OR NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018120000' AND name='shoperation_office_31_forward_v1')
 OR NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE name='office31_fresh_admin_context_gate_v1')
 OR NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE name='office31_fresh_server_entitlement_select_v1')
 OR md5(pg_get_functiondef('public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)'::regprocedure)) <> 'af3bc54456d09fab6c6056a559e9e435'
 THEN RAISE EXCEPTION 'OFFICE31_PARTICIPANT_REMOVE_FORWARD_PRECONDITION_MISMATCH'; END IF;
END $office31_pre$;

CREATE OR REPLACE FUNCTION public.admin_mutate_office_team_chat_v2(p_instance_id uuid, p_actor uuid, p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_thread public.office_threads%rowtype;
  v_thread_after public.office_threads%rowtype;
  v_thread_id uuid;
  v_message_id uuid;
  v_subject text;
  v_body text;
  v_target uuid;
  v_participant uuid;
  v_participants uuid[];
  v_mentions uuid[]:='{}'::uuid[];
  v_mention uuid;
  v_participant_count integer;
  v_operation text;
  v_conversation_type text;
  v_capability jsonb;
  v_object_type text;
  v_object_id uuid;
  v_object_linked boolean:=false;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_PAYLOAD_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='mark_read' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_ACCESS_DENIED'; end if;
    insert into public.office_thread_participants(instance_id,thread_id,user_id,last_read_at,added_by)
    values(p_instance_id,v_thread_id,p_actor,now(),p_actor)
    on conflict(instance_id,thread_id,user_id) do update
      set last_read_at=now(),left_at=null,updated_at=now();
    update public.office_message_mentions
      set seen_at=coalesce(seen_at,now())
      where instance_id=p_instance_id and thread_id=v_thread_id and mentioned_user_id=p_actor and seen_at is null;
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'userId',p_actor,'lastReadAt',now());
  end if;

  if p_action='create_internal_thread' then
    v_capability:=public.evaluate_store_capability_v1(p_instance_id,p_actor,'office.internal_chat',p_actor,p_actor,null,null);
    if not coalesce((v_capability->>'allowed')::boolean,false) then raise exception 'OFFICE_INTERNAL_CHAT_PERMISSION_REQUIRED'; end if;
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=trim(coalesce(p_payload->>'body',''));
    if length(v_subject)<1 or length(v_subject)>180 or length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_INTERNAL_THREAD_PAYLOAD_INVALID'; end if;
    if p_payload?'mentionUserIds' and jsonb_typeof(p_payload->'mentionUserIds')<>'array' then raise exception 'OFFICE_MENTION_LIST_INVALID'; end if;
    if coalesce(jsonb_array_length(coalesce(p_payload->'mentionUserIds','[]'::jsonb)),0)>10 then raise exception 'OFFICE_MENTION_LIST_TOO_LARGE'; end if;

    select array_agg(distinct x order by x) into v_participants
    from (
      select p_actor x
      union all
      select value::text::uuid from jsonb_array_elements_text(coalesce(p_payload->'participantUserIds','[]'::jsonb))
    ) q;
    v_participant_count:=coalesce(cardinality(v_participants),0);
    if v_participant_count<2 or v_participant_count>25 then raise exception 'OFFICE_INTERNAL_PARTICIPANTS_INVALID'; end if;

    foreach v_participant in array v_participants loop
      if not private.office_active_store_member_v1(p_instance_id,v_participant) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_NOT_ACTIVE'; end if;
      v_capability:=public.evaluate_store_capability_v1(p_instance_id,v_participant,'office.internal_chat',v_participant,v_participant,null,null);
      if not coalesce((v_capability->>'allowed')::boolean,false) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_PERMISSION_REQUIRED'; end if;
    end loop;

    select coalesce(array_agg(distinct value::text::uuid),'{}'::uuid[]) into v_mentions
      from jsonb_array_elements_text(coalesce(p_payload->'mentionUserIds','[]'::jsonb));
    foreach v_mention in array v_mentions loop
      if v_mention=p_actor or not (v_mention=any(v_participants)) then raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED'; end if;
    end loop;

    v_object_type:=nullif(trim(coalesce(p_payload->>'objectType','')),'');
    v_object_id:=case when nullif(trim(coalesce(p_payload->>'objectId','')),'') is null then null else (p_payload->>'objectId')::uuid end;
    if (v_object_type is null)<>(v_object_id is null) then raise exception 'OFFICE_OBJECT_LINK_INVALID'; end if;
    if v_object_type is not null and not public.can_manage_support(p_instance_id,p_actor) then raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'; end if;
    if v_object_type is not null and not private.office_chat_object_exists_v1(p_instance_id,v_object_type,v_object_id) then raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'; end if;

    v_conversation_type:=case when v_participant_count=2 then 'internal_private' else 'internal_group' end;
    insert into public.office_threads(instance_id,subject,status,priority,created_by,conversation_type,updated_at)
    values(p_instance_id,v_subject,'open','normal',p_actor,v_conversation_type,now())
    returning * into v_thread_after;

    foreach v_participant in array v_participants loop
      insert into public.office_thread_participants(instance_id,thread_id,user_id,participant_role,last_read_at,added_by)
      values(
        p_instance_id,v_thread_after.id,v_participant,
        case when v_participant=p_actor then 'owner' else 'member' end,
        case when v_participant=p_actor then now() else null end,p_actor
      );
    end loop;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_after.id,p_actor,'internal',v_body)
    returning id into v_message_id;

    foreach v_mention in array v_mentions loop
      insert into public.office_message_mentions(instance_id,message_id,thread_id,mentioned_user_id,mentioned_by)
      values(p_instance_id,v_message_id,v_thread_after.id,v_mention,p_actor);
    end loop;

    if v_object_type is not null then
      insert into public.office_message_object_links(instance_id,message_id,thread_id,object_type,object_id,created_by)
      values(p_instance_id,v_message_id,v_thread_after.id,v_object_type,v_object_id,p_actor);
      v_object_linked:=true;
    end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.private_thread_created_v2','office_thread',v_thread_after.id::text,v_org,p_instance_id,
      'Privát belső irodai beszélgetés létrehozva',
      jsonb_build_object('threadId',v_thread_after.id,'conversationType',v_conversation_type,'participantCount',v_participant_count,'mentionCount',cardinality(v_mentions),'hasObjectLink',v_object_linked),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_team_chat_v2','messageId',v_message_id)
    );
    return jsonb_build_object('id',v_thread_after.id,'threadId',v_thread_after.id,'messageId',v_message_id,'conversationType',v_conversation_type,'participantCount',v_participant_count,'mentionCount',cardinality(v_mentions),'objectLinked',v_object_linked);
  end if;

  if p_action='add_internal_message' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_body:=trim(coalesce(p_payload->>'body',''));
    if length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_INTERNAL_MESSAGE_PAYLOAD_INVALID'; end if;
    if p_payload?'mentionUserIds' and jsonb_typeof(p_payload->'mentionUserIds')<>'array' then raise exception 'OFFICE_MENTION_LIST_INVALID'; end if;
    if coalesce(jsonb_array_length(coalesce(p_payload->'mentionUserIds','[]'::jsonb)),0)>10 then raise exception 'OFFICE_MENTION_LIST_TOO_LARGE'; end if;

    select * into v_thread from public.office_threads
      where id=v_thread_id and instance_id=p_instance_id and conversation_type in ('internal_private','internal_group') for update;
    if not found then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;

    select coalesce(array_agg(distinct value::text::uuid),'{}'::uuid[]) into v_mentions
      from jsonb_array_elements_text(coalesce(p_payload->'mentionUserIds','[]'::jsonb));
    foreach v_mention in array v_mentions loop
      if v_mention=p_actor or not public.can_read_office_thread_v1(p_instance_id,v_thread_id,v_mention) then raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED'; end if;
    end loop;

    v_object_type:=nullif(trim(coalesce(p_payload->>'objectType','')),'');
    v_object_id:=case when nullif(trim(coalesce(p_payload->>'objectId','')),'') is null then null else (p_payload->>'objectId')::uuid end;
    if (v_object_type is null)<>(v_object_id is null) then raise exception 'OFFICE_OBJECT_LINK_INVALID'; end if;
    if v_object_type is not null and not public.can_manage_support(p_instance_id,p_actor) then raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'; end if;
    if v_object_type is not null and not private.office_chat_object_exists_v1(p_instance_id,v_object_type,v_object_id) then raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'; end if;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_id,p_actor,'internal',v_body)
    returning id into v_message_id;

    foreach v_mention in array v_mentions loop
      insert into public.office_message_mentions(instance_id,message_id,thread_id,mentioned_user_id,mentioned_by)
      values(p_instance_id,v_message_id,v_thread_id,v_mention,p_actor);
    end loop;

    if v_object_type is not null then
      insert into public.office_message_object_links(instance_id,message_id,thread_id,object_type,object_id,created_by)
      values(p_instance_id,v_message_id,v_thread_id,v_object_type,v_object_id,p_actor);
      v_object_linked:=true;
    end if;

    update public.office_threads set updated_at=now() where id=v_thread_id and instance_id=p_instance_id;
    if not found then raise exception 'OFFICE_PRIVATE_THREAD_UPDATE_MISSING'; end if;
    update public.office_thread_participants set last_read_at=now(),updated_at=now()
      where instance_id=p_instance_id and thread_id=v_thread_id and user_id=p_actor and left_at is null;
    if not found then raise exception 'OFFICE_PRIVATE_PARTICIPANT_EVIDENCE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,'office.private_message_added_v2','office_thread',v_thread_id::text,v_org,p_instance_id,
      'Privát belső irodai üzenet hozzáadva',
      jsonb_build_object('messageId',v_message_id,'mentionCount',cardinality(v_mentions),'hasObjectLink',v_object_linked),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_team_chat_v2')
    );
    return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id,'mentionCount',cardinality(v_mentions),'objectLinked',v_object_linked);
  end if;

  if p_action='manage_participant' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_operation:=trim(coalesce(p_payload->>'operation',''));
    v_target:=(p_payload->>'targetUserId')::uuid;
    if v_operation not in ('add','remove') then raise exception 'OFFICE_PARTICIPANT_OPERATION_INVALID'; end if;
    select * into v_thread from public.office_threads
      where id=v_thread_id and instance_id=p_instance_id and conversation_type in ('internal_private','internal_group') for update;
    if not found then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;
    if not private.office_active_thread_owner_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_THREAD_OWNER_REQUIRED'; end if;
    if not public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;
    if v_target=p_actor then raise exception 'OFFICE_THREAD_OWNER_SELF_CHANGE_FORBIDDEN'; end if;

    if v_operation='add' then
      if not private.office_active_store_member_v1(p_instance_id,v_target) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_NOT_ACTIVE'; end if;
      v_capability:=public.evaluate_store_capability_v1(p_instance_id,v_target,'office.internal_chat',v_target,v_target,null,null);
      if not coalesce((v_capability->>'allowed')::boolean,false) then raise exception 'OFFICE_INTERNAL_PARTICIPANT_PERMISSION_REQUIRED'; end if;
      insert into public.office_thread_participants(instance_id,thread_id,user_id,participant_role,joined_at,left_at,last_read_at,added_by,updated_at)
      values(p_instance_id,v_thread_id,v_target,'member',now(),null,null,p_actor,now())
      on conflict(instance_id,thread_id,user_id) do update
        set participant_role='member',joined_at=now(),left_at=null,last_read_at=null,added_by=p_actor,updated_at=now();
    else
      update public.office_thread_participants
      set left_at=now(),updated_at=now()
      where instance_id=p_instance_id and thread_id=v_thread_id and user_id=v_target and left_at is null and participant_role='member';
      if not found then raise exception 'OFFICE_PARTICIPANT_NOT_ACTIVE'; end if;
    end if;

    select count(*) into v_participant_count
      from public.office_thread_participants
      where instance_id=p_instance_id and thread_id=v_thread_id and left_at is null;
    if v_participant_count<1 or v_participant_count>25 then raise exception 'OFFICE_INTERNAL_PARTICIPANTS_INVALID'; end if;
    v_conversation_type:=case when v_participant_count<=2 then 'internal_private' else 'internal_group' end;
    update public.office_threads set conversation_type=v_conversation_type,updated_at=now()
      where id=v_thread_id and instance_id=p_instance_id
      returning * into v_thread_after;
    if not found then raise exception 'OFFICE_PRIVATE_THREAD_UPDATE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
    ) values(
      p_actor,case when v_operation='add' then 'office.private_participant_added' else 'office.private_participant_removed' end,
      'office_thread',v_thread_id::text,v_org,p_instance_id,
      case when v_operation='add' then 'Privát irodai résztvevő hozzáadva' else 'Privát irodai résztvevő eltávolítva' end,
      jsonb_build_object('threadId',v_thread_id,'targetUserId',v_target,'participantCount',v_participant_count,'conversationType',v_conversation_type),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_team_chat_v2')
    );
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'targetUserId',v_target,'operation',v_operation,'participantCount',v_participant_count,'conversationType',v_conversation_type);
  end if;

  raise exception 'OFFICE_TEAM_CHAT_ACTION_INVALID';
end;
$function$;

DO $office31_post$
BEGIN
 IF position('v_participant_count<1 or v_participant_count>25' IN pg_get_functiondef('public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)'::regprocedure))=0
 OR position('v_participant_count<=2 then' IN pg_get_functiondef('public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)'::regprocedure))=0
 OR position('v_participant_count<2 or v_participant_count>25' IN pg_get_functiondef('public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)'::regprocedure))=0
 OR NOT has_function_privilege('service_role','public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.admin_mutate_office_team_chat_v2(uuid,uuid,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'OFFICE31_PARTICIPANT_REMOVE_FORWARD_POSTCONDITION_MISMATCH'; END IF;
END $office31_post$;
NOTIFY pgrst, 'reload schema';
