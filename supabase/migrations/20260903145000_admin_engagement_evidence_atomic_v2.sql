-- Atomic evidence closure for support, recommendations, customer B2B roles, coupons and review moderation.
-- Every privileged business mutation and its tamper-evident admin audit commit or roll back together.

create or replace function public.admin_update_support_ticket_v2(
  p_instance_id uuid,
  p_ticket_id uuid,
  p_actor uuid,
  p_status text,
  p_priority text,
  p_admin_note text,
  p_admin_note_present boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.support_tickets%rowtype;
  updated_row public.support_tickets%rowtype;
  v_org uuid;
  v_now timestamptz:=now();
begin
  if p_instance_id is null or p_ticket_id is null or p_actor is null then
    raise exception 'SUPPORT_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_support(p_instance_id,p_actor) then
    raise exception 'SUPPORT_PERMISSION_REQUIRED';
  end if;
  if p_status not in ('open','in_progress','waiting_customer','resolved','closed') then
    raise exception 'SUPPORT_STATUS_INVALID';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'SUPPORT_PRIORITY_INVALID';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into current_row
  from public.support_tickets
  where id=p_ticket_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;

  update public.support_tickets
  set
    status=p_status::public.support_ticket_status,
    priority=p_priority,
    admin_note=case when p_admin_note_present then nullif(trim(coalesce(p_admin_note,'')),'') else current_row.admin_note end,
    resolved_at=case when p_status='resolved' then coalesce(current_row.resolved_at,v_now) else current_row.resolved_at end,
    closed_at=case when p_status='closed' then coalesce(current_row.closed_at,v_now) else current_row.closed_at end,
    updated_at=v_now
  where id=p_ticket_id and instance_id=p_instance_id
  returning * into updated_row;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'support.ticket_updated','support_ticket',p_ticket_id::text,v_org,p_instance_id,
    current_row.ticket_number||': '||p_status,
    to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc')
  );

  return jsonb_build_object(
    'id',updated_row.id,
    'status',updated_row.status,
    'priority',updated_row.priority
  );
end;
$$;

revoke all on function public.admin_update_support_ticket_v2(uuid,uuid,uuid,text,text,text,boolean)
from public,anon,authenticated;
grant execute on function public.admin_update_support_ticket_v2(uuid,uuid,uuid,text,text,text,boolean)
to service_role;


create or replace function public.admin_add_support_reply_v2(
  p_instance_id uuid,
  p_ticket_id uuid,
  p_actor uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  ticket_row public.support_tickets%rowtype;
  message_row public.support_ticket_messages%rowtype;
  v_org uuid;
  v_job uuid;
  v_queued boolean:=false;
  v_notify_error text:=null;
begin
  if p_instance_id is null or p_ticket_id is null or p_actor is null then
    raise exception 'SUPPORT_IDENTITY_REQUIRED';
  end if;
  if length(trim(coalesce(p_message,'')))<2 or length(trim(p_message))>4000 then
    raise exception 'SUPPORT_MESSAGE_INVALID';
  end if;
  if not public.can_manage_support(p_instance_id,p_actor) then
    raise exception 'SUPPORT_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into ticket_row
  from public.support_tickets
  where id=p_ticket_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;
  if ticket_row.status='closed' then raise exception 'SUPPORT_TICKET_CLOSED'; end if;

  insert into public.support_ticket_messages(
    instance_id,ticket_id,author_user_id,author_role,message
  ) values(
    p_instance_id,p_ticket_id,p_actor,'admin',trim(p_message)
  )
  returning * into message_row;

  update public.support_tickets
  set status='waiting_customer',updated_at=now()
  where id=p_ticket_id and instance_id=p_instance_id;

  begin
    select public.enqueue_communication_v2(
      p_instance_id,
      ticket_row.email,
      ticket_row.user_id,
      'transactional',
      'support_reply',
      jsonb_build_object(
        'name',ticket_row.name,
        'ticketId',p_ticket_id,
        'ticketNumber',ticket_row.ticket_number,
        'replyPreview',left(trim(p_message),300)
      ),
      'support-reply:'||p_instance_id::text||':'||message_row.id::text,
      now()
    ) into v_job;
    v_queued:=v_job is not null;
  exception when others then
    v_notify_error:=sqlerrm;
    v_queued:=false;
  end;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'support.reply_added','support_ticket',p_ticket_id::text,v_org,p_instance_id,
    ticket_row.ticket_number||': ügyfélszolgálati válasz',
    jsonb_build_object('status',ticket_row.status),
    jsonb_build_object('status','waiting_customer'),
    jsonb_build_object(
      'audit_source','database_rpc',
      'messageId',message_row.id,
      'notificationQueued',v_queued,
      'notificationError',v_notify_error,
      'communicationJobId',v_job
    )
  );

  return jsonb_build_object(
    'messageId',message_row.id,
    'notificationQueued',v_queued,
    'notificationError',v_notify_error
  );
end;
$$;

revoke all on function public.admin_add_support_reply_v2(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.admin_add_support_reply_v2(uuid,uuid,uuid,text)
to service_role;


create or replace function public.admin_mutate_product_recommendation_v2(
  p_instance_id uuid,
  p_rule_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.product_recommendation_rules%rowtype;
  updated_row public.product_recommendation_rules%rowtype;
  v_org uuid;
  v_source uuid;
  v_recommended uuid;
  v_placement text;
  v_priority integer;
begin
  if p_instance_id is null or p_actor is null then
    raise exception 'RECOMMENDATION_IDENTITY_REQUIRED';
  end if;
  if p_action not in ('create','update','delete') then
    raise exception 'RECOMMENDATION_ACTION_INVALID';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'RECOMMENDATION_PAYLOAD_INVALID';
  end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'CATALOG_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='create' then
    if p_rule_id is not null then raise exception 'RECOMMENDATION_CREATE_ID_INVALID'; end if;
    if exists(
      select 1 from jsonb_object_keys(p_payload) as k(key)
      where k.key not in ('sourceVariantId','recommendedVariantId','placement','priority','headline')
    ) then raise exception 'RECOMMENDATION_FIELD_NOT_ALLOWED'; end if;

    v_source:=case when p_payload->>'sourceVariantId' is null or p_payload->>'sourceVariantId'='' then null else (p_payload->>'sourceVariantId')::uuid end;
    v_recommended:=(p_payload->>'recommendedVariantId')::uuid;
    v_placement:=p_payload->>'placement';
    v_priority:=coalesce((p_payload->>'priority')::integer,100);

    if v_recommended is null then raise exception 'RECOMMENDATION_TARGET_REQUIRED'; end if;
    if v_source is not null and v_source=v_recommended then raise exception 'RECOMMENDATION_SELF_REFERENCE'; end if;
    if v_placement not in ('cart','post_purchase') then raise exception 'RECOMMENDATION_PLACEMENT_INVALID'; end if;
    if v_priority<0 or v_priority>10000 then raise exception 'RECOMMENDATION_PRIORITY_INVALID'; end if;
    if not exists(select 1 from public.product_variants where id=v_recommended and instance_id=p_instance_id) then
      raise exception 'RECOMMENDATION_TARGET_TENANT_MISMATCH';
    end if;
    if v_source is not null and not exists(select 1 from public.product_variants where id=v_source and instance_id=p_instance_id) then
      raise exception 'RECOMMENDATION_SOURCE_TENANT_MISMATCH';
    end if;

    insert into public.product_recommendation_rules(
      instance_id,source_variant_id,recommended_variant_id,placement,priority,headline,active
    ) values(
      p_instance_id,v_source,v_recommended,v_placement,v_priority,p_payload->>'headline',true
    )
    returning * into updated_row;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'catalog.recommendation_created','product_recommendation_rule',updated_row.id::text,v_org,p_instance_id,
      'Termékajánlási szabály létrehozva',to_jsonb(updated_row),
      jsonb_build_object('audit_source','database_rpc')
    );
    return jsonb_build_object('id',updated_row.id,'after',to_jsonb(updated_row));
  end if;

  if p_rule_id is null then raise exception 'RECOMMENDATION_ID_REQUIRED'; end if;
  select * into current_row
  from public.product_recommendation_rules
  where id=p_rule_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'RECOMMENDATION_NOT_FOUND'; end if;

  if p_action='update' then
    if exists(
      select 1 from jsonb_object_keys(p_payload) as k(key)
      where k.key not in ('priority','active','headline')
    ) then raise exception 'RECOMMENDATION_FIELD_NOT_ALLOWED'; end if;
    if p_payload='{}'::jsonb then raise exception 'RECOMMENDATION_PATCH_REQUIRED'; end if;
    if p_payload ? 'priority' and ((p_payload->>'priority')::integer<0 or (p_payload->>'priority')::integer>10000) then
      raise exception 'RECOMMENDATION_PRIORITY_INVALID';
    end if;

    update public.product_recommendation_rules
    set
      priority=case when p_payload ? 'priority' then (p_payload->>'priority')::integer else current_row.priority end,
      active=case when p_payload ? 'active' then (p_payload->>'active')::boolean else current_row.active end,
      headline=case when p_payload ? 'headline' then p_payload->>'headline' else current_row.headline end,
      updated_at=now()
    where id=p_rule_id and instance_id=p_instance_id
    returning * into updated_row;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'catalog.recommendation_updated','product_recommendation_rule',p_rule_id::text,v_org,p_instance_id,
      'Termékajánlási szabály módosítva',to_jsonb(current_row),to_jsonb(updated_row),
      jsonb_build_object('audit_source','database_rpc','patch',p_payload)
    );
    return jsonb_build_object('id',updated_row.id,'after',to_jsonb(updated_row));
  end if;

  delete from public.product_recommendation_rules
  where id=p_rule_id and instance_id=p_instance_id;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,metadata
  ) values(
    p_actor,'catalog.recommendation_deleted','product_recommendation_rule',p_rule_id::text,v_org,p_instance_id,
    'Termékajánlási szabály törölve',to_jsonb(current_row),
    jsonb_build_object('audit_source','database_rpc')
  );
  return jsonb_build_object('id',p_rule_id,'before',to_jsonb(current_row));
end;
$$;

revoke all on function public.admin_mutate_product_recommendation_v2(uuid,uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_product_recommendation_v2(uuid,uuid,uuid,text,jsonb)
to service_role;


create or replace function public.admin_update_customer_store_role_v2(
  p_instance_id uuid,
  p_user_id uuid,
  p_actor uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.customer_instance_roles%rowtype;
  updated_row public.customer_instance_roles%rowtype;
  profile_row record;
  v_org uuid;
  v_role text;
  v_approved boolean;
  v_now timestamptz:=now();
begin
  if p_instance_id is null or p_user_id is null or p_actor is null then
    raise exception 'CUSTOMER_ROLE_IDENTITY_REQUIRED';
  end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then
    raise exception 'CUSTOMER_ROLE_PATCH_REQUIRED';
  end if;
  if exists(
    select 1 from jsonb_object_keys(p_patch) as k(key)
    where k.key not in ('role','resellerApproved')
  ) then raise exception 'CUSTOMER_ROLE_FIELD_NOT_ALLOWED'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then
    raise exception 'SALES_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into current_row
  from public.customer_instance_roles
  where instance_id=p_instance_id and user_id=p_user_id
  for update;
  if not found then raise exception 'CUSTOMER_ROLE_NOT_FOUND'; end if;
  if p_expected_updated_at is not null and current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_CUSTOMER_ROLE';
  end if;

  v_role:=case when p_patch ? 'role' then p_patch->>'role' else current_row.role::text end;
  if v_role not in ('customer','reseller') then raise exception 'CUSTOMER_ROLE_INVALID'; end if;
  v_approved:=case
    when v_role<>'reseller' then false
    when p_patch ? 'resellerApproved' then (p_patch->>'resellerApproved')::boolean
    else current_row.reseller_approved
  end;

  update public.customer_instance_roles
  set
    role=v_role::public.customer_role,
    reseller_approved=v_approved,
    reseller_requested_at=case when v_role='reseller' then coalesce(current_row.reseller_requested_at,v_now) else null end,
    approved_at=case when v_approved then coalesce(current_row.approved_at,v_now) else null end,
    approved_by=case when v_approved then p_actor else null end,
    updated_at=v_now
  where instance_id=p_instance_id and user_id=p_user_id
  returning * into updated_row;

  select email,full_name into profile_row from public.profiles where id=p_user_id;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'customer.store_role_updated','customer_instance_role',p_user_id::text,v_org,p_instance_id,
    coalesce(profile_row.email,profile_row.full_name,p_user_id::text)||' webshop-szerepköre módosítva',
    to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc','patch',p_patch)
  );

  return jsonb_build_object(
    'id',p_user_id,
    'role',updated_row.role,
    'resellerApproved',updated_row.reseller_approved,
    'updatedAt',updated_row.updated_at
  );
end;
$$;

revoke all on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;


create or replace function public.admin_mutate_coupon_v2(
  p_instance_id uuid,
  p_coupon_id uuid,
  p_actor uuid,
  p_action text,
  p_expected_updated_at timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.coupons%rowtype;
  updated_row public.coupons%rowtype;
  v_org uuid;
  v_code text;
  v_discount_type text;
  v_discount_value integer;
  v_starts timestamptz;
  v_ends timestamptz;
begin
  if p_instance_id is null or p_actor is null then raise exception 'COUPON_IDENTITY_REQUIRED'; end if;
  if p_action not in ('create','update') then raise exception 'COUPON_ACTION_INVALID'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'COUPON_PAYLOAD_INVALID'; end if;
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'MARKETING_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='create' then
    if p_coupon_id is not null then raise exception 'COUPON_CREATE_ID_INVALID'; end if;
    if exists(
      select 1 from jsonb_object_keys(p_payload) as k(key)
      where k.key not in ('code','description','discountType','discountValue','minSubtotalHuf','maxDiscountHuf','usageLimit','startsAt','endsAt')
    ) then raise exception 'COUPON_FIELD_NOT_ALLOWED'; end if;

    v_code:=upper(trim(p_payload->>'code'));
    v_discount_type:=p_payload->>'discountType';
    v_discount_value:=(p_payload->>'discountValue')::integer;
    v_starts:=case when p_payload->>'startsAt' is null or p_payload->>'startsAt'='' then null else (p_payload->>'startsAt')::timestamptz end;
    v_ends:=case when p_payload->>'endsAt' is null or p_payload->>'endsAt'='' then null else (p_payload->>'endsAt')::timestamptz end;

    if v_code !~ '^[A-Z0-9_-]{3,32}$' then raise exception 'COUPON_CODE_INVALID'; end if;
    if v_discount_type not in ('percent','fixed') then raise exception 'COUPON_DISCOUNT_TYPE_INVALID'; end if;
    if v_discount_value<=0 or (v_discount_type='percent' and v_discount_value>100) then raise exception 'COUPON_DISCOUNT_VALUE_INVALID'; end if;
    if v_starts is not null and v_ends is not null and v_ends<=v_starts then raise exception 'COUPON_DATE_INVALID'; end if;

    insert into public.coupons(
      instance_id,code,description,discount_type,discount_value,min_subtotal_huf,
      max_discount_huf,usage_limit,starts_at,ends_at,active
    ) values(
      p_instance_id,v_code,nullif(trim(coalesce(p_payload->>'description','')),''),
      v_discount_type,v_discount_value,coalesce((p_payload->>'minSubtotalHuf')::integer,0),
      case when p_payload->>'maxDiscountHuf' is null then null else (p_payload->>'maxDiscountHuf')::integer end,
      case when p_payload->>'usageLimit' is null then null else (p_payload->>'usageLimit')::integer end,
      v_starts,v_ends,true
    )
    returning * into updated_row;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'coupon.created','coupon',updated_row.id::text,v_org,p_instance_id,
      updated_row.code||' kupon létrehozva',to_jsonb(updated_row),
      jsonb_build_object('audit_source','database_rpc')
    );
    return jsonb_build_object('id',updated_row.id,'code',updated_row.code);
  end if;

  if p_coupon_id is null then raise exception 'COUPON_ID_REQUIRED'; end if;
  if exists(
    select 1 from jsonb_object_keys(p_payload) as k(key)
    where k.key not in ('active','description','usageLimit','endsAt')
  ) then raise exception 'COUPON_FIELD_NOT_ALLOWED'; end if;
  if p_payload='{}'::jsonb then raise exception 'COUPON_PATCH_REQUIRED'; end if;

  select * into current_row
  from public.coupons
  where id=p_coupon_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'COUPON_NOT_FOUND'; end if;
  if p_expected_updated_at is not null and current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_COUPON';
  end if;
  if p_payload ? 'usageLimit'
     and p_payload->>'usageLimit' is not null
     and (p_payload->>'usageLimit')::integer<coalesce(current_row.usage_count,0) then
    raise exception 'COUPON_USAGE_LIMIT_BELOW_USAGE';
  end if;
  if p_payload ? 'endsAt'
     and p_payload->>'endsAt' is not null
     and current_row.starts_at is not null
     and (p_payload->>'endsAt')::timestamptz<=current_row.starts_at then
    raise exception 'COUPON_DATE_INVALID';
  end if;

  update public.coupons
  set
    active=case when p_payload ? 'active' then (p_payload->>'active')::boolean else current_row.active end,
    description=case when p_payload ? 'description' then nullif(trim(coalesce(p_payload->>'description','')),'') else current_row.description end,
    usage_limit=case when p_payload ? 'usageLimit' then case when p_payload->>'usageLimit' is null then null else (p_payload->>'usageLimit')::integer end else current_row.usage_limit end,
    ends_at=case when p_payload ? 'endsAt' then case when p_payload->>'endsAt' is null then null else (p_payload->>'endsAt')::timestamptz end else current_row.ends_at end,
    updated_at=now()
  where id=p_coupon_id and instance_id=p_instance_id
  returning * into updated_row;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'coupon.updated','coupon',p_coupon_id::text,v_org,p_instance_id,
    updated_row.code||' kupon módosítva',to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc','patch',p_payload)
  );

  return jsonb_build_object('id',updated_row.id,'code',updated_row.code);
end;
$$;

revoke all on function public.admin_mutate_coupon_v2(uuid,uuid,uuid,text,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_coupon_v2(uuid,uuid,uuid,text,timestamptz,jsonb)
to service_role;


create or replace function public.admin_moderate_product_review_v2(
  p_instance_id uuid,
  p_review_id uuid,
  p_actor uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.product_reviews%rowtype;
  updated_row public.product_reviews%rowtype;
  v_org uuid;
begin
  if p_instance_id is null or p_review_id is null or p_actor is null then raise exception 'REVIEW_IDENTITY_REQUIRED'; end if;
  if p_status not in ('approved','rejected') then raise exception 'REVIEW_STATUS_INVALID'; end if;
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'MARKETING_PERMISSION_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into current_row
  from public.product_reviews
  where id=p_review_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'REVIEW_NOT_FOUND'; end if;
  if current_row.status<>'pending' then raise exception 'REVIEW_ALREADY_MODERATED'; end if;

  update public.product_reviews
  set status=p_status,moderated_at=now()
  where id=p_review_id and instance_id=p_instance_id
  returning * into updated_row;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'review.moderated','product_review',p_review_id::text,v_org,p_instance_id,
    'Vásárlói vélemény moderálva: '||p_status,to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc')
  );

  return jsonb_build_object('id',updated_row.id,'status',updated_row.status);
end;
$$;

revoke all on function public.admin_moderate_product_review_v2(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.admin_moderate_product_review_v2(uuid,uuid,uuid,text)
to service_role;
