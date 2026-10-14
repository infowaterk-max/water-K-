-- Core #1186 U10A1 — strict tenant-subscription authority for Digital Office SQL.
-- Forward-only source migration. DO NOT cherry-pick onto staging with missing
-- Office privacy foundations. Customer-baseline parity is a separate blocked
-- dependency (U10A2); this file alone is not production-release proof.

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
-- Keep customer Office and private Team Chat independent after the common
-- Pro subscription test. Participant membership is never replaced by RBAC.
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
      and w.subscription_plan='pro'
  ) then return false; end if;

  select * into v_thread from public.office_threads
  where id=p_thread_id and instance_id=p_instance_id;
  if not found then return false; end if;

  if v_thread.conversation_type='customer' then
    return private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')
       and public.can_manage_support(p_instance_id,p_user_id);
  end if;
  if v_thread.conversation_type not in ('internal_private','internal_group') then return false; end if;
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
-- PostgreSQL evaluates policy predicates in the querying role; private schema
-- is not a PostgREST-exposed RPC surface.
grant execute on function private.office_pro_plan_allowed_v1(uuid) to authenticated;

drop policy if exists office_threads_strict_pro_v1 on public.office_threads;
create policy office_threads_strict_pro_v1 on public.office_threads
  as restrictive for select to authenticated
  using (private.office_pro_plan_allowed_v1(instance_id));

drop policy if exists office_messages_strict_pro_v1 on public.office_messages;
create policy office_messages_strict_pro_v1 on public.office_messages
  as restrictive for select to authenticated
  using (private.office_pro_plan_allowed_v1(instance_id));

drop policy if exists office_tasks_strict_pro_v1 on public.office_tasks;
create policy office_tasks_strict_pro_v1 on public.office_tasks
  as restrictive for select to authenticated
  using (private.office_pro_plan_allowed_v1(instance_id));

-- No new authenticated table GRANT, no mutation of customer records, no
-- broad platform exception and no change to base Alap transactional email.
