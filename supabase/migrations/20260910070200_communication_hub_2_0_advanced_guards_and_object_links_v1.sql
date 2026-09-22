-- Roadmap Block 9 — advanced entitlement guards + customer-email business object links.
-- Reuses office_message_object_links; no parallel relation engine is created.

create or replace function private.office_effective_feature_enabled_v1(p_instance_id uuid,p_feature_code text)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_enabled boolean;
begin
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then return false; end if;
  select e.enabled into v_enabled
  from public.feature_entitlements e
  where e.organization_id=v_org
    and e.feature_code=p_feature_code
    and (e.instance_id=p_instance_id or e.instance_id is null)
    and e.valid_from<=now()
    and (e.valid_until is null or e.valid_until>now())
  order by case when e.instance_id=p_instance_id then 1 else 0 end desc,e.updated_at desc
  limit 1;
  return coalesce(v_enabled,false);
end;
$$;
revoke all on function private.office_effective_feature_enabled_v1(uuid,text) from public,anon,authenticated,service_role;

create or replace function private.office_advanced_actor_v1(p_instance_id uuid,p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(select 1 from public.platform_operators p where p.user_id=p_actor)
    or private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced');
$$;
revoke all on function private.office_advanced_actor_v1(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.admin_update_office_mailbox_responsibility_v2(
  p_instance_id uuid,p_actor uuid,p_mailbox_key text,p_responsible_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if not private.office_advanced_actor_v1(p_instance_id,p_actor) then raise exception 'OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED'; end if;
  v_result:=public.admin_update_office_mailbox_responsibility_v1(p_instance_id,p_actor,p_mailbox_key,p_responsible_user_id);
  return v_result||jsonb_build_object('advancedEntitlement',true);
end;
$$;
revoke all on function public.admin_update_office_mailbox_responsibility_v1(uuid,uuid,text,uuid) from service_role;
revoke all on function public.admin_update_office_mailbox_responsibility_v2(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_office_mailbox_responsibility_v2(uuid,uuid,text,uuid) to service_role;

create or replace function public.admin_update_office_thread_relationships_v2(
  p_instance_id uuid,p_actor uuid,p_thread_id uuid,p_customer_user_id uuid,p_customer_ref text,p_sales_owner_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if not private.office_advanced_actor_v1(p_instance_id,p_actor) then raise exception 'OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED'; end if;
  v_result:=public.admin_update_office_thread_relationships_v1(p_instance_id,p_actor,p_thread_id,p_customer_user_id,p_customer_ref,p_sales_owner_user_id);
  return v_result||jsonb_build_object('advancedEntitlement',true);
end;
$$;
revoke all on function public.admin_update_office_thread_relationships_v1(uuid,uuid,uuid,uuid,text,uuid) from service_role;
revoke all on function public.admin_update_office_thread_relationships_v2(uuid,uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_office_thread_relationships_v2(uuid,uuid,uuid,uuid,text,uuid) to service_role;

create or replace function private.enforce_office_message_object_integrity_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_message public.office_messages%rowtype;
  v_thread public.office_threads%rowtype;
begin
  select * into v_message from public.office_messages
  where id=new.message_id and thread_id=new.thread_id and instance_id=new.instance_id;
  if not found or v_message.author_id is distinct from new.created_by then
    raise exception 'OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID';
  end if;
  select * into v_thread from public.office_threads where id=new.thread_id and instance_id=new.instance_id;
  if not found then raise exception 'OFFICE_OBJECT_THREAD_INTEGRITY_INVALID'; end if;

  if v_message.kind='internal' then
    if v_thread.conversation_type not in('internal_private','internal_group') then raise exception 'OFFICE_OBJECT_THREAD_INTEGRITY_INVALID'; end if;
    if not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.created_by) then raise exception 'OFFICE_OBJECT_AUTHOR_ACCESS_REQUIRED'; end if;
  elsif v_message.kind='email_out' then
    if v_thread.conversation_type<>'customer' then raise exception 'OFFICE_OBJECT_CUSTOMER_THREAD_REQUIRED'; end if;
    if not private.office_advanced_actor_v1(new.instance_id,new.created_by) then raise exception 'OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED'; end if;
    if not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.created_by) then raise exception 'OFFICE_OBJECT_AUTHOR_ACCESS_REQUIRED'; end if;
  else
    raise exception 'OFFICE_OBJECT_MESSAGE_KIND_INVALID';
  end if;

  if not public.can_manage_support(new.instance_id,new.created_by) then raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'; end if;
  if not private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id) then raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'; end if;
  return new;
end;
$$;
revoke all on function private.enforce_office_message_object_integrity_v1() from public,anon,authenticated,service_role;

create or replace function public.admin_queue_office_email_v6(p_instance_id uuid,p_actor uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_result jsonb;
  v_message_id uuid;
  v_thread_id uuid;
  v_object_type text:=nullif(trim(coalesce(p_payload->>'objectType','')),'');
  v_object_id uuid:=case when nullif(trim(coalesce(p_payload->>'objectId','')),'') is null then null else (p_payload->>'objectId')::uuid end;
  v_acting_for uuid:=case when nullif(trim(coalesce(p_payload->>'actingForUserId','')),'') is null then null else (p_payload->>'actingForUserId')::uuid end;
  v_link_id uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
  if (v_object_type is null)<>(v_object_id is null) then raise exception 'OFFICE_OBJECT_LINK_INVALID'; end if;
  if (v_object_type is not null or (v_acting_for is not null and v_acting_for<>p_actor))
     and not private.office_advanced_actor_v1(p_instance_id,p_actor) then
    raise exception 'OFFICE_EMAIL_ADVANCED_PLAN_REQUIRED';
  end if;
  if v_object_type is not null and not private.office_chat_object_exists_v1(p_instance_id,v_object_type,v_object_id) then
    raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND';
  end if;

  v_result:=public.admin_queue_office_email_v5(p_instance_id,p_actor,p_payload);
  v_message_id:=(v_result->>'messageId')::uuid;
  v_thread_id:=(v_result->>'threadId')::uuid;
  if v_message_id is null or v_thread_id is null then raise exception 'OFFICE_EMAIL_EVIDENCE_MISSING'; end if;

  if v_object_type is not null then
    insert into public.office_message_object_links(instance_id,message_id,thread_id,object_type,object_id,created_by)
    values(p_instance_id,v_message_id,v_thread_id,v_object_type,v_object_id,p_actor)
    returning id into v_link_id;
    if v_link_id is null then raise exception 'OFFICE_OBJECT_LINK_EVIDENCE_MISSING'; end if;
  end if;

  return v_result||jsonb_build_object('objectLinked',v_link_id is not null,'objectLinkId',v_link_id);
end;
$$;
revoke all on function public.admin_queue_office_email_v6(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_queue_office_email_v6(uuid,uuid,jsonb) to service_role;
revoke all on function public.admin_queue_office_email_v5(uuid,uuid,jsonb) from service_role;

comment on function public.admin_queue_office_email_v6(uuid,uuid,jsonb) is 'Block 9 final atomic customer-email queue: v5 attachment/delegation evidence plus optional tenant-validated existing business-object link; advanced features require effective Pro entitlement.';
