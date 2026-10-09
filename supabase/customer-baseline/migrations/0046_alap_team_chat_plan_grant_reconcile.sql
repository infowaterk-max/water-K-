-- Core #1186 U02: forward-only, tenant-scoped Alap Team Chat plan grant reconciliation.
-- Requires the existing Block 11 canonical grant catalogue and private sync function.
-- Do not remove manual, trial, platform or add-on override history; the U01 server
-- entitlement gate already denies Pro-only internal chat to Alap regardless of source.
-- Executed within the migration runner's transaction. A failed assertion aborts it.

delete from public.plan_capability_grants
where plan_code = 'alap'
  and capability_code = 'teamChat';

do $alap_team_chat_reconcile$
declare
  v_instance_id uuid;
begin
  -- Fail closed instead of quietly damaging existing Pro or customer-email plans.
  if exists (
    select 1 from public.plan_capability_grants
    where plan_code = 'alap' and capability_code = 'teamChat'
  ) then
    raise exception 'ALAP_TEAM_CHAT_PLAN_GRANT_STILL_PRESENT';
  end if;

  if not exists (
    select 1 from public.plan_capability_grants
    where plan_code = 'pro' and capability_code = 'teamChat'
  ) then
    raise exception 'PRO_TEAM_CHAT_PLAN_GRANT_MISSING';
  end if;

  if not exists (
    select 1 from public.plan_capability_grants
    where plan_code = 'alap' and capability_code = 'officeCommunication'
  ) or not exists (
    select 1 from public.plan_capability_grants
    where plan_code = 'alap' and capability_code = 'support'
  ) then
    raise exception 'ALAP_CUSTOMER_COMMUNICATION_PLAN_GRANT_MISSING';
  end if;

  -- Reconcile only plan-managed rows; the existing function deletes and rebuilds
  -- source='plan' within one instance. No higher-priority override is deleted.
  for v_instance_id in
    select w.id from public.webshop_instances w
    where w.subscription_plan = 'alap'
    order by w.id
  loop
    perform private.sync_webshop_plan_entitlements(v_instance_id);
  end loop;

  if exists (
    select 1
    from public.feature_entitlements e
    join public.webshop_instances w on w.id = e.instance_id
    where w.subscription_plan = 'alap'
      and e.source = 'plan'
      and e.feature_code = 'teamChat'
      and e.enabled = true
  ) then
    raise exception 'ALAP_TEAM_CHAT_STALE_PLAN_ROW_REMAINS';
  end if;
end
$alap_team_chat_reconcile$;
