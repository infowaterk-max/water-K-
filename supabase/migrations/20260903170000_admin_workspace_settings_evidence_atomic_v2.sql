-- Atomic evidence closure for Digital Office, platform webshop settings,
-- commerce provider configuration and webshop launch activation.

create or replace function public.admin_mutate_office_workspace_v2(
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
  v_thread public.office_threads%rowtype;
  v_thread_after public.office_threads%rowtype;
  v_task public.office_tasks%rowtype;
  v_task_after public.office_tasks%rowtype;
  v_thread_id uuid;
  v_task_id uuid;
  v_message_id uuid;
  v_job uuid;
  v_order_id uuid;
  v_order_email text;
  v_order_number text;
  v_email text;
  v_subject text;
  v_body text;
  v_kind text;
  v_status text;
  v_priority text;
  v_title text;
  v_due_at timestamptz;
  v_profile_id uuid;
  v_profile_name text;
  v_idempotency_key text;
begin
  if p_instance_id is null or p_actor is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'OFFICE_PAYLOAD_REQUIRED'; end if;
  if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='create_thread' then
    v_subject:=trim(coalesce(p_payload->>'subject',''));
    v_body:=trim(coalesce(p_payload->>'body',''));
    v_email:=lower(trim(coalesce(p_payload->>'email','')));
    v_order_id:=case when nullif(p_payload->>'orderId','') is null then null else (p_payload->>'orderId')::uuid end;
    if length(v_subject)<1 or length(v_subject)>180 or length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_THREAD_PAYLOAD_INVALID'; end if;
    if v_order_id is not null then
      select customer_email into v_order_email from public.orders where id=v_order_id and instance_id=p_instance_id;
      if not found then raise exception 'OFFICE_ORDER_NOT_FOUND'; end if;
      if v_email='' then v_email:=lower(trim(coalesce(v_order_email,''))); end if;
    end if;

    insert into public.office_threads(instance_id,subject,customer_email,order_id,created_by,assigned_to,last_read_at)
    values(p_instance_id,v_subject,nullif(v_email,''),v_order_id,p_actor,p_actor,now())
    returning * into v_thread_after;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_after.id,p_actor,'internal',v_body)
    returning id into v_message_id;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'office.thread_created','office_thread',v_thread_after.id::text,v_org,p_instance_id,
      left(v_subject||' irodai szál létrehozva',500),
      jsonb_build_object('threadId',v_thread_after.id,'orderId',v_order_id,'customerEmail',nullif(v_email,'')),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2','messageId',v_message_id)
    );

    return jsonb_build_object('id',v_thread_after.id,'threadId',v_thread_after.id,'messageId',v_message_id);
  end if;

  if p_action='add_message' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_body:=trim(coalesce(p_payload->>'body',''));
    v_kind:=coalesce(p_payload->>'kind','internal');
    if v_kind not in ('internal','note') or length(v_body)<1 or length(v_body)>10000 then raise exception 'OFFICE_MESSAGE_PAYLOAD_INVALID'; end if;
    select * into v_thread from public.office_threads where id=v_thread_id and instance_id=p_instance_id for update;
    if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;

    insert into public.office_messages(instance_id,thread_id,author_id,kind,body)
    values(p_instance_id,v_thread_id,p_actor,v_kind,v_body)
    returning id into v_message_id;
    update public.office_threads set updated_at=now(),last_read_at=now()
    where id=v_thread_id and instance_id=p_instance_id returning * into v_thread_after;
    if not found then raise exception 'OFFICE_THREAD_UPDATE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.message_added','office_thread',v_thread_id::text,v_org,p_instance_id,
      left(v_thread.subject||' irodai bejegyzés hozzáadva',500),
      jsonb_build_object('updatedAt',v_thread.updated_at,'lastReadAt',v_thread.last_read_at),
      jsonb_build_object('updatedAt',v_thread_after.updated_at,'lastReadAt',v_thread_after.last_read_at),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2','messageId',v_message_id,'kind',v_kind)
    );
    return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id);
  end if;

  if p_action='update_thread' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_status:=coalesce(p_payload->>'status','open');
    v_priority:=coalesce(p_payload->>'priority','normal');
    if v_status not in ('open','closed') or v_priority not in ('low','normal','high','urgent') then raise exception 'OFFICE_THREAD_STATE_INVALID'; end if;
    select * into v_thread from public.office_threads where id=v_thread_id and instance_id=p_instance_id for update;
    if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;

    update public.office_threads
    set status=v_status,
        priority=v_priority,
        assigned_to=case when coalesce((p_payload->>'ownerSelf')::boolean,false) then p_actor else null end,
        last_read_at=now(),
        updated_at=now()
    where id=v_thread_id and instance_id=p_instance_id
    returning * into v_thread_after;
    if not found then raise exception 'OFFICE_THREAD_UPDATE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.thread_updated','office_thread',v_thread_id::text,v_org,p_instance_id,
      left(v_thread.subject||' irodai szál módosítva',500),
      jsonb_build_object('status',v_thread.status,'priority',v_thread.priority,'assignedTo',v_thread.assigned_to),
      jsonb_build_object('status',v_thread_after.status,'priority',v_thread_after.priority,'assignedTo',v_thread_after.assigned_to),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2')
    );
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'status',v_thread_after.status,'priority',v_thread_after.priority);
  end if;

  if p_action='mark_read' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    update public.office_threads set last_read_at=now()
    where id=v_thread_id and instance_id=p_instance_id
    returning * into v_thread_after;
    if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;
    return jsonb_build_object('id',v_thread_id,'threadId',v_thread_id,'lastReadAt',v_thread_after.last_read_at);
  end if;

  if p_action='send_email' then
    v_thread_id:=(p_payload->>'threadId')::uuid;
    v_body:=trim(coalesce(p_payload->>'body',''));
    v_idempotency_key:=trim(coalesce(p_payload->>'idempotencyKey',''));
    if length(v_body)<1 or length(v_body)>4000 or length(v_idempotency_key)<10 then raise exception 'OFFICE_EMAIL_PAYLOAD_INVALID'; end if;
    select * into v_thread from public.office_threads where id=v_thread_id and instance_id=p_instance_id for update;
    if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;
    v_email:=lower(trim(coalesce(v_thread.customer_email,'')));
    if v_email='' then raise exception 'OFFICE_CUSTOMER_EMAIL_REQUIRED'; end if;

    select id,full_name into v_profile_id,v_profile_name
    from public.profiles where lower(email)=v_email limit 1;
    if v_thread.order_id is not null then
      select order_number into v_order_number from public.orders where id=v_thread.order_id and instance_id=p_instance_id;
      if not found then raise exception 'OFFICE_ORDER_NOT_FOUND'; end if;
    end if;

    v_job:=public.enqueue_communication_v2(
      p_instance_id,
      v_email,
      v_profile_id,
      'transactional',
      'support_reply',
      jsonb_build_object(
        'name',coalesce(v_profile_name,'Vásárlónk'),
        'ticketId',v_thread_id,
        'ticketNumber',coalesce(v_order_number,v_thread.subject),
        'replyPreview',v_body,
        'orderNumber',v_order_number,
        'officeThreadId',v_thread_id
      ),
      v_idempotency_key,
      now()
    );
    if v_job is null then raise exception 'OFFICE_COMMUNICATION_JOB_MISSING'; end if;

    insert into public.office_messages(
      instance_id,thread_id,author_id,kind,body,communication_job_id,recipient_email,subject
    ) values(
      p_instance_id,v_thread_id,p_actor,'email_out',v_body,v_job,v_email,'Re: '||v_thread.subject
    ) returning id into v_message_id;

    update public.office_threads set updated_at=now(),last_read_at=now()
    where id=v_thread_id and instance_id=p_instance_id returning * into v_thread_after;
    if not found then raise exception 'OFFICE_THREAD_UPDATE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.customer_email_queued','office_thread',v_thread_id::text,v_org,p_instance_id,
      left(v_thread.subject||' ügyfél-e-mail sorba állítva',500),
      jsonb_build_object('updatedAt',v_thread.updated_at),
      jsonb_build_object('updatedAt',v_thread_after.updated_at,'communicationJobId',v_job),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2','messageId',v_message_id,'communicationJobId',v_job)
    );
    return jsonb_build_object('id',v_message_id,'threadId',v_thread_id,'messageId',v_message_id,'jobId',v_job);
  end if;

  if p_action='create_task' then
    v_title:=trim(coalesce(p_payload->>'title',''));
    v_thread_id:=case when nullif(p_payload->>'threadId','') is null then null else (p_payload->>'threadId')::uuid end;
    v_due_at:=case when nullif(p_payload->>'dueAt','') is null then null else (p_payload->>'dueAt')::timestamptz end;
    if length(v_title)<1 or length(v_title)>240 then raise exception 'OFFICE_TASK_PAYLOAD_INVALID'; end if;
    if v_thread_id is not null then
      perform 1 from public.office_threads where id=v_thread_id and instance_id=p_instance_id;
      if not found then raise exception 'OFFICE_THREAD_NOT_FOUND'; end if;
    end if;

    insert into public.office_tasks(instance_id,thread_id,title,created_by,assigned_to,due_at)
    values(p_instance_id,v_thread_id,v_title,p_actor,p_actor,v_due_at)
    returning * into v_task_after;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'office.task_created','office_task',v_task_after.id::text,v_org,p_instance_id,
      left(v_title||' irodai feladat létrehozva',500),
      jsonb_build_object('taskId',v_task_after.id,'threadId',v_thread_id,'dueAt',v_due_at,'status',v_task_after.status),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2')
    );
    return jsonb_build_object('id',v_task_after.id,'taskId',v_task_after.id,'status',v_task_after.status);
  end if;

  if p_action='complete_task' then
    v_task_id:=(p_payload->>'id')::uuid;
    select * into v_task from public.office_tasks where id=v_task_id and instance_id=p_instance_id for update;
    if not found then raise exception 'OFFICE_TASK_NOT_FOUND'; end if;
    if v_task.status='done' then return jsonb_build_object('id',v_task_id,'taskId',v_task_id,'status','done','replayed',true); end if;

    update public.office_tasks set status='done',completed_at=now()
    where id=v_task_id and instance_id=p_instance_id returning * into v_task_after;
    if not found then raise exception 'OFFICE_TASK_UPDATE_MISSING'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'office.task_completed','office_task',v_task_id::text,v_org,p_instance_id,
      left(v_task.title||' irodai feladat lezárva',500),
      jsonb_build_object('status',v_task.status,'completedAt',v_task.completed_at),
      jsonb_build_object('status',v_task_after.status,'completedAt',v_task_after.completed_at),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_workspace_v2')
    );
    return jsonb_build_object('id',v_task_id,'taskId',v_task_id,'status',v_task_after.status,'replayed',false);
  end if;

  raise exception 'OFFICE_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_office_workspace_v2(uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_office_workspace_v2(uuid,uuid,text,jsonb)
to service_role;


create or replace function public.platform_mutate_webshop_config_v3(
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
  v_before public.webshop_instances%rowtype;
  v_after public.webshop_instances%rowtype;
  v_org uuid;
  v_addon text;
  v_enabled boolean;
  v_addon_before jsonb;
  v_addon_after jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'PLATFORM_CONFIG_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'PLATFORM_CONFIG_PAYLOAD_REQUIRED'; end if;
  if not exists(
    select 1 from public.platform_operators
    where user_id=p_actor and role in ('owner','admin','operator')
  ) then raise exception 'PLATFORM_OPERATOR_REQUIRED'; end if;

  select * into v_before from public.webshop_instances where id=p_instance_id for update;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  v_org:=v_before.organization_id;

  if p_action='plan_status' then
    if p_payload->>'plan' not in ('alap','pro') then raise exception 'PLATFORM_PLAN_INVALID'; end if;
    if p_payload->>'status' not in ('pilot','active','suspended','archived') then raise exception 'PLATFORM_STATUS_INVALID'; end if;
    update public.webshop_instances
    set subscription_plan=p_payload->>'plan',status=p_payload->>'status',updated_at=now()
    where id=p_instance_id returning * into v_after;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'platform.webshop_plan_status_updated','webshop_instance',p_instance_id::text,v_org,p_instance_id,
      left(v_before.name||' csomag/státusz módosítva',500),
      jsonb_build_object('plan',v_before.subscription_plan,'status',v_before.status),
      jsonb_build_object('plan',v_after.subscription_plan,'status',v_after.status),
      jsonb_build_object('audit_source','database_rpc','rpc','platform_mutate_webshop_config_v3')
    );
    return jsonb_build_object('id',p_instance_id,'plan',v_after.subscription_plan,'status',v_after.status);
  end if;

  if p_action='branding' then
    if length(trim(coalesce(p_payload->>'brandName','')))<2 then raise exception 'PLATFORM_BRAND_NAME_INVALID'; end if;
    update public.webshop_instances set
      brand_name=p_payload->>'brandName',
      brand_tagline=p_payload->>'brandTagline',
      logo_url=p_payload->>'logoUrl',
      primary_color=p_payload->>'primaryColor',
      support_email=p_payload->>'supportEmail',
      support_phone=p_payload->>'supportPhone',
      public_site_url=p_payload->>'publicSiteUrl',
      email_from_name=p_payload->>'emailFromName',
      updated_at=now()
    where id=p_instance_id returning * into v_after;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'platform.webshop_branding_updated','webshop_instance',p_instance_id::text,v_org,p_instance_id,
      left(v_before.name||' arculati adatok módosítva',500),
      jsonb_build_object('brandName',v_before.brand_name,'supportEmail',v_before.support_email,'primaryColor',v_before.primary_color),
      jsonb_build_object('brandName',v_after.brand_name,'supportEmail',v_after.support_email,'primaryColor',v_after.primary_color),
      jsonb_build_object('audit_source','database_rpc','rpc','platform_mutate_webshop_config_v3')
    );
    return jsonb_build_object('id',p_instance_id,'brandName',v_after.brand_name);
  end if;

  if p_action='storefront' then
    if jsonb_typeof(p_payload->'storefrontConfig')<>'object' then raise exception 'PLATFORM_STOREFRONT_CONFIG_INVALID'; end if;
    update public.webshop_instances set storefront_config=p_payload->'storefrontConfig',updated_at=now()
    where id=p_instance_id returning * into v_after;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'platform.webshop_storefront_updated','webshop_instance',p_instance_id::text,v_org,p_instance_id,
      left(v_before.name||' storefront beállítások módosítva',500),
      jsonb_build_object('storefrontConfig',v_before.storefront_config),
      jsonb_build_object('storefrontConfig',v_after.storefront_config),
      jsonb_build_object('audit_source','database_rpc','rpc','platform_mutate_webshop_config_v3')
    );
    return jsonb_build_object('id',p_instance_id);
  end if;

  if p_action='addon' then
    v_addon:=p_payload->>'addon';
    v_enabled:=coalesce((p_payload->>'enabled')::boolean,false);
    if v_addon not in ('ai-assistant','advanced-export','priority-support','custom-integration') then raise exception 'PLATFORM_ADDON_INVALID'; end if;
    if v_addon='custom-integration' and v_before.subscription_plan<>'pro' then raise exception 'PLATFORM_ADDON_PLAN_INCOMPATIBLE'; end if;

    select to_jsonb(a) into v_addon_before from public.webshop_instance_addons a
    where a.instance_id=p_instance_id and a.addon_code=v_addon for update;

    insert into public.webshop_instance_addons(instance_id,addon_code,enabled,updated_at)
    values(p_instance_id,v_addon,v_enabled,now())
    on conflict(instance_id,addon_code) do update set enabled=excluded.enabled,updated_at=excluded.updated_at;

    select to_jsonb(a) into v_addon_after from public.webshop_instance_addons a
    where a.instance_id=p_instance_id and a.addon_code=v_addon;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'platform.webshop_addon_updated','webshop_addon',(p_instance_id::text||':'||v_addon),v_org,p_instance_id,
      left(v_before.name||' kiegészítő módosítva: '||v_addon,500),
      v_addon_before,v_addon_after,
      jsonb_build_object('audit_source','database_rpc','rpc','platform_mutate_webshop_config_v3')
    );
    return jsonb_build_object('id',p_instance_id,'addon',v_addon,'enabled',v_enabled);
  end if;

  raise exception 'PLATFORM_CONFIG_ACTION_INVALID';
end;
$$;

revoke all on function public.platform_mutate_webshop_config_v3(uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.platform_mutate_webshop_config_v3(uuid,uuid,text,jsonb)
to service_role;


create or replace function public.admin_mutate_commerce_provider_connection_v2(
  p_instance_id uuid,
  p_actor uuid,
  p_provider_code text,
  p_action text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_provider record;
  v_before jsonb;
  v_after public.webshop_instance_provider_connections%rowtype;
  v_present text[];
  v_fee integer;
  v_configuration jsonb;
begin
  if p_instance_id is null or p_actor is null or nullif(trim(p_provider_code),'') is null then raise exception 'COMMERCE_PROVIDER_IDENTITY_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'COMMERCE_PROVIDER_PAYLOAD_REQUIRED'; end if;
  if not public.is_platform_operator(p_actor) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor) then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select code,provider_type,connection_mode,adapter_key into v_provider
  from public.commerce_provider_catalog where code=p_provider_code and is_available=true;
  if not found then raise exception 'COMMERCE_PROVIDER_NOT_FOUND'; end if;

  if p_payload ? 'credentialFieldsPresent' and jsonb_typeof(p_payload->'credentialFieldsPresent')<>'array' then
    raise exception 'COMMERCE_PROVIDER_CREDENTIAL_EVIDENCE_INVALID';
  end if;
  v_present:=array(select jsonb_array_elements_text(coalesce(p_payload->'credentialFieldsPresent','[]'::jsonb)));

  if p_action='save' then
    if p_payload->>'connectionStatus' not in ('not_configured','configured','active','error') then raise exception 'COMMERCE_PROVIDER_STATUS_INVALID'; end if;
    if p_payload->>'onboardingStep' not in ('selection','contract','credentials','verification','ready') then raise exception 'COMMERCE_PROVIDER_STEP_INVALID'; end if;
    if p_payload ? 'configuration' and jsonb_typeof(p_payload->'configuration')<>'object' then raise exception 'COMMERCE_PROVIDER_CONFIGURATION_INVALID'; end if;
    v_fee:=case when p_payload->'feeHuf' is null or p_payload->'feeHuf'='null'::jsonb then null else (p_payload->>'feeHuf')::integer end;
    if v_fee is not null and (v_fee<0 or v_fee>1000000) then raise exception 'COMMERCE_PROVIDER_FEE_INVALID'; end if;
    v_configuration:=case when p_payload ? 'configuration' then p_payload->'configuration' else '{}'::jsonb end;

    select to_jsonb(c) into v_before from public.webshop_instance_provider_connections c
    where c.instance_id=p_instance_id and c.provider_code=p_provider_code for update;

    insert into public.webshop_instance_provider_connections(
      instance_id,provider_code,enabled,display_label,fee_huf,configuration,
      connection_status,onboarding_step,credential_fields_present,updated_at
    ) values(
      p_instance_id,p_provider_code,coalesce((p_payload->>'enabled')::boolean,false),
      p_payload->>'displayLabel',case when v_provider.provider_type='shipping' then v_fee else null end,
      v_configuration,p_payload->>'connectionStatus',p_payload->>'onboardingStep',v_present,now()
    )
    on conflict(instance_id,provider_code) do update set
      enabled=excluded.enabled,
      display_label=excluded.display_label,
      fee_huf=excluded.fee_huf,
      configuration=case when p_payload ? 'configuration' then excluded.configuration else public.webshop_instance_provider_connections.configuration end,
      connection_status=excluded.connection_status,
      onboarding_step=excluded.onboarding_step,
      credential_fields_present=excluded.credential_fields_present,
      updated_at=excluded.updated_at
    returning * into v_after;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'commerce.provider_updated','commerce_provider_connection',(p_instance_id::text||':'||p_provider_code),v_org,p_instance_id,
      left(p_provider_code||' szolgáltatói beállítás módosítva',500),
      v_before,to_jsonb(v_after),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_commerce_provider_connection_v2','providerType',v_provider.provider_type)
    );
    return jsonb_build_object('providerCode',v_after.provider_code,'status',v_after.connection_status,'enabled',v_after.enabled);
  end if;

  if p_action='verify' then
    if p_payload->>'connectionStatus' not in ('not_configured','configured','active','error') then raise exception 'COMMERCE_PROVIDER_STATUS_INVALID'; end if;
    if p_payload->>'onboardingStep' not in ('selection','contract','credentials','verification','ready') then raise exception 'COMMERCE_PROVIDER_STEP_INVALID'; end if;

    select to_jsonb(c) into v_before from public.webshop_instance_provider_connections c
    where c.instance_id=p_instance_id and c.provider_code=p_provider_code for update;
    if v_before is null then raise exception 'COMMERCE_PROVIDER_CONNECTION_NOT_FOUND'; end if;

    update public.webshop_instance_provider_connections set
      connection_status=p_payload->>'connectionStatus',
      onboarding_step=p_payload->>'onboardingStep',
      credential_fields_present=v_present,
      last_tested_at=coalesce((p_payload->>'lastTestedAt')::timestamptz,now()),
      last_test_message=left(p_payload->>'lastTestMessage',2000),
      updated_at=now()
    where instance_id=p_instance_id and provider_code=p_provider_code
    returning * into v_after;
    if not found then raise exception 'COMMERCE_PROVIDER_VERIFICATION_WRITE_MISSING'; end if;

    insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
    values(
      p_actor,'commerce.provider_verified','commerce_provider_connection',(p_instance_id::text||':'||p_provider_code),v_org,p_instance_id,
      left(p_provider_code||' szolgáltatói kapcsolat ellenőrizve',500),
      v_before,to_jsonb(v_after),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_commerce_provider_connection_v2','providerType',v_provider.provider_type)
    );
    return jsonb_build_object('providerCode',v_after.provider_code,'status',v_after.connection_status,'enabled',v_after.enabled);
  end if;

  raise exception 'COMMERCE_PROVIDER_ACTION_INVALID';
end;
$$;

revoke all on function public.admin_mutate_commerce_provider_connection_v2(uuid,uuid,text,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_commerce_provider_connection_v2(uuid,uuid,text,text,jsonb)
to service_role;


create or replace function public.admin_activate_webshop_v2(
  p_instance_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before public.webshop_instances%rowtype;
  v_after public.webshop_instances%rowtype;
begin
  if p_instance_id is null or p_actor is null then raise exception 'WEBSHOP_ACTIVATION_IDENTITY_REQUIRED'; end if;
  if not public.is_platform_operator(p_actor) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor) then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;
  select * into v_before from public.webshop_instances where id=p_instance_id for update;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  if v_before.status='active' then return jsonb_build_object('id',p_instance_id,'status','active','replayed',true); end if;
  if v_before.status<>'pilot' then raise exception 'WEBSHOP_ACTIVATION_STATE_INVALID'; end if;

  update public.webshop_instances set status='active',updated_at=now()
  where id=p_instance_id and status='pilot'
  returning * into v_after;
  if not found then raise exception 'WEBSHOP_ACTIVATION_WRITE_MISSING'; end if;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'store.activated','webshop_instance',p_instance_id::text,v_before.organization_id,p_instance_id,
    left(v_before.name||' webshop aktiválva',500),
    jsonb_build_object('status',v_before.status),
    jsonb_build_object('status',v_after.status),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_activate_webshop_v2')
  );

  return jsonb_build_object('id',p_instance_id,'status',v_after.status,'replayed',false);
end;
$$;

revoke all on function public.admin_activate_webshop_v2(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.admin_activate_webshop_v2(uuid,uuid)
to service_role;

comment on function public.admin_mutate_office_workspace_v2(uuid,uuid,text,jsonb)
is 'Tenant-scoped Digital Office mutations with atomic evidence; read markers return database evidence without audit-log noise.';
comment on function public.platform_mutate_webshop_config_v3(uuid,uuid,text,jsonb)
is 'Platform webshop plan, branding, storefront and addon mutations with atomic admin audit evidence.';
comment on function public.admin_mutate_commerce_provider_connection_v2(uuid,uuid,text,text,jsonb)
is 'Store-manager provider configuration and verification persistence with atomic admin audit evidence.';
comment on function public.admin_activate_webshop_v2(uuid,uuid)
is 'Activates a pilot webshop together with append-only admin audit evidence in one transaction.';
