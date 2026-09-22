-- Commercial admin evidence v3.
-- Interactive CRM writes must be tenant-scoped, audited and evidence-bearing in the same transaction.
-- Legacy tenant-aware v2 helpers remain internal implementation details and are no longer directly callable by service_role.

create or replace function public.admin_refresh_commercial_workspace_v3(
  p_instance_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_opportunities jsonb;
  v_tasks integer;
  v_b2c integer;
  v_b2b integer;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_actor is null then raise exception 'COMMERCIAL_REFRESH_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  v_opportunities:=public.plan_commercial_opportunities_v2(p_instance_id);
  v_tasks:=public.plan_high_value_sales_tasks_v2(p_instance_id);

  if jsonb_typeof(v_opportunities)<>'object'
     or not (v_opportunities ? 'b2c_inserts')
     or not (v_opportunities ? 'b2b_upserts')
     or v_tasks is null then
    raise exception 'COMMERCIAL_REFRESH_EVIDENCE_MISSING';
  end if;

  begin
    v_b2c:=(v_opportunities->>'b2c_inserts')::integer;
    v_b2b:=(v_opportunities->>'b2b_upserts')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'COMMERCIAL_REFRESH_EVIDENCE_INVALID';
  end;
  if v_b2c<0 or v_b2b<0 or v_tasks<0 then raise exception 'COMMERCIAL_REFRESH_EVIDENCE_INVALID'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,'commercial.workspace_refreshed','commercial_workspace',v_org,p_instance_id,
    left('Értékesítési lehetőségek és feladatok frissítve · lehetőségek: '||(v_b2c+v_b2b)||' · feladatok: '||v_tasks,500),
    jsonb_build_object('opportunities',v_opportunities,'tasks',v_tasks),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_refresh_commercial_workspace_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'ok',true,
    'opportunities',v_opportunities,
    'tasks',v_tasks,
    'auditId',v_audit_id
  );
end;
$$;

create or replace function public.admin_transition_commercial_opportunity_v3(
  p_instance_id uuid,
  p_opportunity_id uuid,
  p_actor uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before public.commercial_opportunities%rowtype;
  v_after public.commercial_opportunities%rowtype;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_opportunity_id is null or p_actor is null then raise exception 'COMMERCIAL_OPPORTUNITY_IDENTITY_REQUIRED'; end if;
  if p_status not in ('open','in_progress','won','lost','dismissed') then raise exception 'COMMERCIAL_OPPORTUNITY_STATUS_INVALID'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_before from public.commercial_opportunities
  where id=p_opportunity_id and instance_id=p_instance_id for update;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_NOT_FOUND'; end if;

  update public.commercial_opportunities
  set status=p_status,
      closed_at=case when p_status in ('won','lost','dismissed') then now() else null end,
      updated_at=now()
  where id=p_opportunity_id and instance_id=p_instance_id
  returning * into v_after;
  if not found or v_after.status<>p_status then raise exception 'COMMERCIAL_OPPORTUNITY_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'commercial.opportunity_status_changed','commercial_opportunity',p_opportunity_id::text,v_org,p_instance_id,
    left('Értékesítési lehetőség: '||v_before.status||' → '||v_after.status,500),
    to_jsonb(v_before),to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_transition_commercial_opportunity_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object('ok',true,'id',p_opportunity_id,'status',v_after.status,'auditId',v_audit_id);
end;
$$;

create or replace function public.admin_transition_sales_task_v3(
  p_instance_id uuid,
  p_task_id uuid,
  p_actor uuid,
  p_status text,
  p_outcome text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before public.sales_tasks%rowtype;
  v_after public.sales_tasks%rowtype;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_task_id is null or p_actor is null then raise exception 'SALES_TASK_IDENTITY_REQUIRED'; end if;
  if p_status not in ('open','in_progress','completed','cancelled') then raise exception 'SALES_TASK_STATUS_INVALID'; end if;
  if p_outcome is not null and length(p_outcome)>1000 then raise exception 'SALES_TASK_OUTCOME_INVALID'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_before from public.sales_tasks
  where id=p_task_id and instance_id=p_instance_id for update;
  if not found then raise exception 'SALES_TASK_NOT_FOUND'; end if;

  update public.sales_tasks
  set status=p_status,
      outcome=p_outcome,
      completed_at=case when p_status='completed' then now() else null end,
      updated_at=now()
  where id=p_task_id and instance_id=p_instance_id
  returning * into v_after;
  if not found or v_after.status<>p_status then raise exception 'SALES_TASK_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'commercial.sales_task_status_changed','sales_task',p_task_id::text,v_org,p_instance_id,
    left('Értékesítési feladat: '||v_before.status||' → '||v_after.status,500),
    to_jsonb(v_before),to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_transition_sales_task_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object('ok',true,'id',p_task_id,'status',v_after.status,'auditId',v_audit_id);
end;
$$;

create or replace function public.admin_create_commercial_offer_v3(
  p_instance_id uuid,
  p_opportunity_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_discount_percent numeric,
  p_minimum_margin_percent numeric,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before_opportunity public.commercial_opportunities%rowtype;
  v_after_opportunity public.commercial_opportunities%rowtype;
  v_offer public.commercial_offers%rowtype;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_opportunity_id is null or p_variant_id is null or p_actor is null then raise exception 'COMMERCIAL_OFFER_IDENTITY_REQUIRED'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'COMMERCIAL_OFFER_QUANTITY_INVALID'; end if;
  if p_discount_percent is null or p_discount_percent<0 or p_discount_percent>100 then raise exception 'COMMERCIAL_OFFER_DISCOUNT_INVALID'; end if;
  if p_minimum_margin_percent is null or p_minimum_margin_percent<0 or p_minimum_margin_percent>100 then raise exception 'COMMERCIAL_OFFER_MARGIN_INVALID'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_before_opportunity from public.commercial_opportunities
  where id=p_opportunity_id and instance_id=p_instance_id for update;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_NOT_FOUND'; end if;

  select * into v_offer from public.create_commercial_offer_v2(
    p_instance_id,p_opportunity_id,p_variant_id,p_quantity,p_discount_percent,p_minimum_margin_percent,p_actor
  );
  if v_offer.id is null or v_offer.instance_id<>p_instance_id then raise exception 'COMMERCIAL_OFFER_EVIDENCE_MISSING'; end if;
  select * into v_after_opportunity from public.commercial_opportunities
  where id=p_opportunity_id and instance_id=p_instance_id;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'commercial.offer_created','commercial_offer',v_offer.id::text,v_org,p_instance_id,
    left('Értékesítési ajánlattervezet létrehozva',500),
    jsonb_build_object('opportunity',to_jsonb(v_before_opportunity)),
    jsonb_build_object('offer',to_jsonb(v_offer),'opportunity',to_jsonb(v_after_opportunity)),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_create_commercial_offer_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object('ok',true,'id',v_offer.id,'status',v_offer.status,'offer',to_jsonb(v_offer),'auditId',v_audit_id);
end;
$$;

create or replace function public.admin_approve_commercial_offer_v3(
  p_instance_id uuid,
  p_offer_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before public.commercial_offers%rowtype;
  v_after public.commercial_offers%rowtype;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_offer_id is null or p_actor is null then raise exception 'COMMERCIAL_OFFER_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_before from public.commercial_offers
  where id=p_offer_id and instance_id=p_instance_id for update;
  if not found then raise exception 'COMMERCIAL_OFFER_NOT_FOUND'; end if;

  select * into v_after from public.approve_commercial_offer_v2(p_instance_id,p_offer_id);
  if v_after.id is null or v_after.instance_id<>p_instance_id or v_after.status<>'approved' then raise exception 'COMMERCIAL_OFFER_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'commercial.offer_approved','commercial_offer',p_offer_id::text,v_org,p_instance_id,
    left('Értékesítési ajánlat jóváhagyva',500),
    to_jsonb(v_before),to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_approve_commercial_offer_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object('ok',true,'id',v_after.id,'status',v_after.status,'offer',to_jsonb(v_after),'auditId',v_audit_id);
end;
$$;

create or replace function public.admin_transition_commercial_offer_v3(
  p_instance_id uuid,
  p_offer_id uuid,
  p_actor uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before public.commercial_offers%rowtype;
  v_after public.commercial_offers%rowtype;
  v_before_opportunity public.commercial_opportunities%rowtype;
  v_after_opportunity public.commercial_opportunities%rowtype;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_offer_id is null or p_actor is null then raise exception 'COMMERCIAL_OFFER_IDENTITY_REQUIRED'; end if;
  if p_status not in ('sent','accepted','expired','cancelled') then raise exception 'COMMERCIAL_OFFER_STATUS_INVALID'; end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select * into v_before from public.commercial_offers
  where id=p_offer_id and instance_id=p_instance_id for update;
  if not found then raise exception 'COMMERCIAL_OFFER_NOT_FOUND'; end if;
  select * into v_before_opportunity from public.commercial_opportunities
  where id=v_before.opportunity_id and instance_id=p_instance_id for update;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_NOT_FOUND'; end if;

  select * into v_after from public.transition_commercial_offer_v2(p_instance_id,p_offer_id,p_status);
  if v_after.id is null or v_after.instance_id<>p_instance_id or v_after.status<>p_status then raise exception 'COMMERCIAL_OFFER_EVIDENCE_MISSING'; end if;
  select * into v_after_opportunity from public.commercial_opportunities
  where id=v_before.opportunity_id and instance_id=p_instance_id;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'commercial.offer_status_changed','commercial_offer',p_offer_id::text,v_org,p_instance_id,
    left('Értékesítési ajánlat: '||v_before.status||' → '||v_after.status,500),
    jsonb_build_object('offer',to_jsonb(v_before),'opportunity',to_jsonb(v_before_opportunity)),
    jsonb_build_object('offer',to_jsonb(v_after),'opportunity',to_jsonb(v_after_opportunity)),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_transition_commercial_offer_v3')
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'COMMERCIAL_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object('ok',true,'id',v_after.id,'status',v_after.status,'offer',to_jsonb(v_after),'auditId',v_audit_id);
end;
$$;

revoke all on function public.admin_refresh_commercial_workspace_v3(uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_transition_sales_task_v3(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.admin_create_commercial_offer_v3(uuid,uuid,uuid,integer,numeric,numeric,uuid) from public,anon,authenticated;
revoke all on function public.admin_approve_commercial_offer_v3(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text) from public,anon,authenticated;

grant execute on function public.admin_refresh_commercial_workspace_v3(uuid,uuid) to service_role;
grant execute on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text) to service_role;
grant execute on function public.admin_transition_sales_task_v3(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.admin_create_commercial_offer_v3(uuid,uuid,uuid,integer,numeric,numeric,uuid) to service_role;
grant execute on function public.admin_approve_commercial_offer_v3(uuid,uuid,uuid) to service_role;
grant execute on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text) to service_role;

-- Retire direct service-runtime access to the unaudited v2 admin helpers.
revoke all on function public.plan_commercial_opportunities_v2(uuid) from public,anon,authenticated,service_role;
revoke all on function public.plan_high_value_sales_tasks_v2(uuid) from public,anon,authenticated,service_role;
revoke all on function public.create_commercial_offer_v2(uuid,uuid,uuid,integer,numeric,numeric,uuid) from public,anon,authenticated,service_role;
revoke all on function public.approve_commercial_offer_v2(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.transition_commercial_offer_v2(uuid,uuid,text) from public,anon,authenticated,service_role;

comment on function public.admin_refresh_commercial_workspace_v3(uuid,uuid)
is 'Atomically refreshes tenant commercial opportunities/tasks and records admin audit evidence.';
comment on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
is 'Tenant-scoped opportunity status mutation with atomic admin audit evidence.';
comment on function public.admin_transition_sales_task_v3(uuid,uuid,uuid,text,text)
is 'Tenant-scoped sales task mutation with atomic admin audit evidence.';
comment on function public.admin_create_commercial_offer_v3(uuid,uuid,uuid,integer,numeric,numeric,uuid)
is 'Creates a commercial offer through the guarded v2 engine and commits admin audit evidence in the same transaction.';
comment on function public.admin_approve_commercial_offer_v3(uuid,uuid,uuid)
is 'Approves a commercial offer and commits admin audit evidence in the same transaction.';
comment on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
is 'Transitions a commercial offer and commits offer/opportunity audit evidence in the same transaction.';
