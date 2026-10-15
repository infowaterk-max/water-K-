-- Shoperation-Office-Source: 20261015090000_digital_office_plan_scoped_sql_guard_v2.sql sha256=e0e5f2610bce0bdf59e94e0c1c57e2e0f61a11c3d95d55ee82e66e8db90b3fcf
-- Core #1186 U10A2-F6: plan-scoped Office tenant read authority (supersedes unsafe blanket-Pro v1).
-- Forward-only source. Preserve Alap customer officeCommunication/support while
-- requiring actual Pro subscription for teamChat and advanced Office.
-- Never replay the older 20261010093000 strict-Pro v1 source after this migration.
-- Requires ordered F1R/F3/F4/F5 sources; no hosted RLS proof is asserted.

do $office_strict_pro_preflight$
declare
  v_table text;
begin
  if to_regprocedure('public.can_read_office_thread_v1(uuid,uuid,uuid)') is null
     or to_regprocedure('private.current_user_can_read_office_thread_v1(uuid,uuid)') is null
     or to_regprocedure('private.office_effective_feature_enabled_v1(uuid,text)') is null
     or to_regprocedure('private.office_advanced_actor_v1(uuid,uuid)') is null
     or to_regprocedure('private.office_active_participant_v1(uuid,uuid,uuid)') is null then
    raise exception 'OFFICE_STRICT_PRO_PRIVACY_PREREQUISITE_MISSING';
  end if;
  foreach v_table in array array['office_threads','office_messages','office_tasks'] loop
    if to_regclass('public.'||v_table) is null then
      raise exception 'OFFICE_STRICT_PRO_TABLE_MISSING: %',v_table;
    end if;
    if not exists(
      select 1 from pg_catalog.pg_policies p
      where p.schemaname='public' and p.tablename=v_table
        and p.policyname=v_table||'_store_all'
        and p.permissive='PERMISSIVE' and p.cmd='SELECT'
        and p.roles::text like '%authenticated%'
        and p.qual like '%current_user_can_read_office_thread_v1%'
    ) then
      raise exception 'OFFICE_STRICT_PRO_PARTICIPANT_RLS_PREREQUISITE_MISSING: %',v_table;
    end if;
  end loop;
end;
$office_strict_pro_preflight$;

-- Keep one canonical database resolver. Respect the same active-source priority
-- as src/lib/entitlements/policy.ts, but NEVER let a stale/manual/trial/platform
-- entitlement override an actual Alap subscription for strict Office features.
create or replace function private.office_effective_feature_enabled_v1(
  p_instance_id uuid,p_feature_code text
) returns boolean
language plpgsql
stable
security definer
set search_path=''
as $office_entitlement$
declare
  v_org uuid;
  v_plan text;
  v_enabled boolean;
begin
  if p_instance_id is null or nullif(trim(p_feature_code),'') is null then return false; end if;
  select w.organization_id,w.subscription_plan into v_org,v_plan
  from public.webshop_instances w where w.id=p_instance_id;
  if v_org is null then return false; end if;

  if p_feature_code in ('officeCommunicationAdvanced','teamChat','teamChatSecureAttachments')
     and v_plan is distinct from 'pro' then
    return false;
  end if;

  select e.enabled into v_enabled
  from public.feature_entitlements e
  where e.organization_id=v_org
    and e.feature_code=p_feature_code
    and e.source in ('platform','manual','trial','addon','plan')
    and (e.instance_id=p_instance_id or e.instance_id is null)
    and e.valid_from<=now()
    and (e.valid_until is null or e.valid_until>now())
  order by case e.source
    when 'platform' then 500 when 'manual' then 400
    when 'trial' then 300 when 'addon' then 200 when 'plan' then 100
    else 0 end desc,
    case when e.instance_id=p_instance_id then 1 else 0 end desc,
    e.updated_at desc,e.id asc
  limit 1;
  return coalesce(v_enabled,false);
end;
$office_entitlement$;

revoke all on function private.office_effective_feature_enabled_v1(uuid,text)
  from public,anon,authenticated,service_role;

-- Existing v2 RPCs call this helper with service_role. Platform-operator status
-- may grant administration but must NOT waive tenant Pro for Office content.
create or replace function private.office_advanced_actor_v1(
  p_instance_id uuid,p_actor uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $office_advanced_actor$
  select p_actor is not null
    and private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced');
$office_advanced_actor$;

revoke all on function private.office_advanced_actor_v1(uuid,uuid)
  from public,anon,authenticated,service_role;

-- The same helper is used by private current-user RLS and privileged service
-- RPC reads: enforce plan+feature here too, not only on Next.js routes.
-- Keep customer Office and private Team Chat independent: customer support is
-- available to entitled Alap/Pro; only internal chat is subscription-Pro-only.
-- Participant membership and capability checks are never replaced by plan rights.
create or replace function public.can_read_office_thread_v1(
  p_instance_id uuid,
  p_thread_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language plpgsql
stable
security definer
set search_path=''
as $office_thread_read$
declare
  v_thread public.office_threads%rowtype;
  v_capability jsonb;
begin
  if p_instance_id is null or p_thread_id is null or p_user_id is null then return false; end if;
  if not exists(
    select 1 from public.webshop_instances w
    where w.id=p_instance_id and w.organization_id is not null
  ) then return false; end if;

  select * into v_thread from public.office_threads
  where id=p_thread_id and instance_id=p_instance_id;
  if not found then return false; end if;

  if v_thread.conversation_type='customer' then
    return private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunication')
       and public.can_manage_support(p_instance_id,p_user_id);
  end if;
  if v_thread.conversation_type not in ('internal_private','internal_group') then return false; end if;
  -- Do not permit platform/manual/trial overrides to unlock Pro-only private chat.
  if not exists(
    select 1 from public.webshop_instances w
    where w.id=p_instance_id and w.organization_id is not null
      and w.subscription_plan='pro'
  ) then return false; end if;
  if not private.office_effective_feature_enabled_v1(p_instance_id,'teamChat') then return false; end if;
  if not private.office_active_participant_v1(p_instance_id,p_thread_id,p_user_id) then return false; end if;
  v_capability:=public.evaluate_store_capability_v1(
    p_instance_id,p_user_id,'office.internal_chat',p_user_id,p_user_id,
    v_thread.topic_code,v_thread.mailbox_key
  );
  return coalesce((v_capability->>'allowed')::boolean,false);
end;
$office_thread_read$;

revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role;

-- RESTRICTIVE policies are AND-ed with existing participant-aware PERMISSIVE
-- SELECT policies. They cannot turn an existing denial into an allow.
create or replace function private.office_pro_plan_allowed_v1(
  p_instance_id uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $office_pro_plan$
  select exists(
    select 1 from public.webshop_instances w
    where w.id=p_instance_id
      and w.organization_id is not null
      and w.subscription_plan='pro'
  );
$office_pro_plan$;

revoke all on function private.office_pro_plan_allowed_v1(uuid)
  from public,anon,authenticated,service_role;
-- Historical Pro helper is retained for server compatibility, but no longer
-- appears in customer RLS predicates: do not expose cross-tenant plan probes.
-- The new current-user-bound v2 helpers below are the ONLY authenticated
-- plan-scoped predicate entry points.

-- RESTRICTIVE is an AND boundary over every current/future PERMISSIVE policy:
-- restrict to the authenticated current user's actual row-level permission, not
-- blanket Pro or an unscoped tenant entitlement. Private schema is not an RPC.
create or replace function private.office_thread_plan_allowed_v2(
  p_instance_id uuid,
  p_thread_id uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $office_thread_plan$
  select p_instance_id is not null and p_thread_id is not null
    and auth.uid() is not null
    and public.can_read_office_thread_v1(p_instance_id,p_thread_id,auth.uid());
$office_thread_plan$;
revoke all on function private.office_thread_plan_allowed_v2(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.office_thread_plan_allowed_v2(uuid,uuid) to authenticated;

-- A task may have no customer thread. In that case require active basic Office
-- entitlement AND current user's support role; a linked task inherits its thread.
create or replace function private.office_task_plan_allowed_v2(
  p_instance_id uuid,
  p_thread_id uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $office_task_plan$
  select case
    when p_instance_id is null or auth.uid() is null then false
    when p_thread_id is null then
      private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunication')
      and public.can_manage_support(p_instance_id,auth.uid())
    else private.office_thread_plan_allowed_v2(p_instance_id,p_thread_id)
  end;
$office_task_plan$;
revoke all on function private.office_task_plan_allowed_v2(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.office_task_plan_allowed_v2(uuid,uuid) to authenticated;

-- Old global-Pro restrictive policies would AND with corrected policies and
-- still deny Alap customers. Remove them before adding the scoped rules.
drop policy if exists office_threads_strict_pro_v1 on public.office_threads;
drop policy if exists office_messages_strict_pro_v1 on public.office_messages;
drop policy if exists office_tasks_strict_pro_v1 on public.office_tasks;

drop policy if exists office_threads_plan_scoped_v2 on public.office_threads;
create policy office_threads_plan_scoped_v2 on public.office_threads
  as restrictive for select to authenticated
  using (private.office_thread_plan_allowed_v2(instance_id,id));

drop policy if exists office_messages_plan_scoped_v2 on public.office_messages;
create policy office_messages_plan_scoped_v2 on public.office_messages
  as restrictive for select to authenticated
  using (private.office_thread_plan_allowed_v2(instance_id,thread_id));

drop policy if exists office_tasks_plan_scoped_v2 on public.office_tasks;
create policy office_tasks_plan_scoped_v2 on public.office_tasks
  as restrictive for select to authenticated
  using (private.office_task_plan_allowed_v2(instance_id,thread_id));

-- No new browser table GRANT, no customer data DML, no platform operator
-- bypass and no change to the Alap transactional-email capability.
