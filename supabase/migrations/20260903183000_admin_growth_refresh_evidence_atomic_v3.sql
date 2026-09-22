-- Admin Growth refresh evidence wrapper.
-- Keep the cron-facing v2 planner/dispatcher contracts intact, while making the interactive
-- admin refresh one transaction with durable audit evidence and explicit partial status.

create or replace function public.admin_refresh_growth_workflows_v3(
  p_instance_id uuid,
  p_actor uuid,
  p_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_planned jsonb;
  v_dispatched jsonb;
  v_blocked integer;
  v_queued integer;
  v_seen integer;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_actor is null then
    raise exception 'GROWTH_REFRESH_IDENTITY_REQUIRED';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'GROWTH_REFRESH_LIMIT_INVALID';
  end if;
  if not public.can_manage_marketing(p_instance_id,p_actor)
     and not public.is_platform_operator(p_actor) then
    raise exception 'MARKETING_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  v_planned:=public.plan_customer_retention_journeys_v2(p_instance_id);
  if jsonb_typeof(v_planned)<>'object'
     or not (v_planned ? 'journeysSeen')
     or not (v_planned ? 'stepsCreated') then
    raise exception 'GROWTH_PLAN_EVIDENCE_MISSING';
  end if;

  v_dispatched:=public.dispatch_due_customer_journey_steps_v2(p_instance_id,p_limit);
  if jsonb_typeof(v_dispatched)<>'object'
     or not (v_dispatched ? 'seen')
     or not (v_dispatched ? 'queued')
     or not (v_dispatched ? 'blocked') then
    raise exception 'GROWTH_DISPATCH_EVIDENCE_MISSING';
  end if;

  begin
    v_seen:=(v_dispatched->>'seen')::integer;
    v_queued:=(v_dispatched->>'queued')::integer;
    v_blocked:=(v_dispatched->>'blocked')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'GROWTH_DISPATCH_EVIDENCE_INVALID';
  end;

  if v_seen<0 or v_queued<0 or v_blocked<0 or v_queued+v_blocked>v_seen then
    raise exception 'GROWTH_DISPATCH_EVIDENCE_INVALID';
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor,
    'growth.workflows_refreshed',
    'customer_journey',
    v_org,
    p_instance_id,
    left(
      'Növekedési folyamatok frissítve · sorba állítva: '||v_queued||
      ' · blokkolva: '||v_blocked,
      500
    ),
    jsonb_build_object('planned',v_planned,'dispatched',v_dispatched),
    jsonb_build_object(
      'audit_source','database_rpc',
      'rpc','admin_refresh_growth_workflows_v3',
      'partial',v_blocked>0,
      'limit',p_limit
    )
  ) returning id into v_audit_id;
  if v_audit_id is null then raise exception 'GROWTH_AUDIT_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'ok',true,
    'planned',v_planned,
    'dispatched',v_dispatched,
    'partial',v_blocked>0,
    'auditId',v_audit_id
  );
end;
$$;

revoke all on function public.admin_refresh_growth_workflows_v3(uuid,uuid,integer)
from public,anon,authenticated;
grant execute on function public.admin_refresh_growth_workflows_v3(uuid,uuid,integer)
to service_role;

comment on function public.admin_refresh_growth_workflows_v3(uuid,uuid,integer)
is 'Interactive admin Growth refresh: planner, dispatcher and audit share one transaction; blocked steps are returned explicitly instead of being presented as full success.';
