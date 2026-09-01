-- Strict tenant cutover for merchant intelligence. Apply only after 159500/159605/159610 and gap preflight.
do $$begin if exists(select 1 from public.merchant_intelligence_tenant_gaps where rows_without_instance>0) then raise exception 'merchant_intelligence_tenant_gaps_not_zero';end if;end$$;

alter table public.customer_journeys alter column instance_id set not null;
alter table public.customer_journey_steps alter column instance_id set not null;
alter table public.customer_lifecycle_milestones alter column instance_id set not null;
alter table public.control_alerts alter column instance_id set not null;
alter table public.control_alert_events alter column instance_id set not null;
alter table public.control_tasks alter column instance_id set not null;
alter table public.control_processing_runs alter column instance_id set not null;
alter table public.action_proposals alter column instance_id set not null;
alter table public.action_proposal_events alter column instance_id set not null;
alter table public.action_approvals alter column instance_id set not null;
alter table public.action_executions alter column instance_id set not null;
alter table public.action_processing_runs alter column instance_id set not null;
alter table public.automation_processing_runs alter column instance_id set not null;
alter table public.automation_runbook_instances alter column instance_id set not null;
alter table public.automation_step_runs alter column store_instance_id set not null;
alter table public.automation_events alter column store_instance_id set not null;

-- Tenant-local business identities.
alter table public.customer_journeys drop constraint if exists customer_journeys_kind_source_key_key;
alter table public.control_alerts drop constraint if exists control_alerts_alert_key_key;
alter table public.control_alert_events drop constraint if exists control_alert_events_event_key_key;
alter table public.control_tasks drop constraint if exists control_tasks_task_key_key;
alter table public.control_processing_runs drop constraint if exists control_processing_runs_run_key_key;
alter table public.action_proposals drop constraint if exists action_proposals_proposal_key_key;
alter table public.action_proposal_events drop constraint if exists action_proposal_events_event_key_key;
alter table public.action_executions drop constraint if exists action_executions_execution_key_key;
alter table public.action_processing_runs drop constraint if exists action_processing_runs_run_key_key;
alter table public.automation_processing_runs drop constraint if exists automation_processing_runs_run_key_key;
alter table public.automation_runbook_instances drop constraint if exists automation_runbook_instances_instance_key_key;
alter table public.automation_events drop constraint if exists automation_events_event_key_key;
create unique index if not exists customer_journeys_instance_kind_source_uidx on public.customer_journeys(instance_id,kind,source_key);
create unique index if not exists control_alerts_instance_key_uidx on public.control_alerts(instance_id,alert_key);
create unique index if not exists control_alert_events_instance_key_uidx on public.control_alert_events(instance_id,event_key);
create unique index if not exists control_tasks_instance_key_uidx on public.control_tasks(instance_id,task_key);
create unique index if not exists control_processing_runs_instance_key_uidx on public.control_processing_runs(instance_id,run_key);
create unique index if not exists action_proposals_instance_key_uidx on public.action_proposals(instance_id,proposal_key);
create unique index if not exists action_proposal_events_instance_key_uidx on public.action_proposal_events(instance_id,event_key);
create unique index if not exists action_executions_instance_key_uidx on public.action_executions(instance_id,execution_key);
create unique index if not exists action_processing_runs_instance_key_uidx on public.action_processing_runs(instance_id,run_key);
create unique index if not exists automation_processing_runs_instance_key_uidx on public.automation_processing_runs(instance_id,run_key);
create unique index if not exists automation_runbook_instances_instance_key_uidx on public.automation_runbook_instances(instance_id,instance_key);
create unique index if not exists automation_events_store_key_uidx on public.automation_events(store_instance_id,event_key);

create or replace function public.can_read_merchant_intelligence(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],p_user_id);$$;
create or replace function public.can_manage_merchant_intelligence(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin'],p_user_id);$$;

-- RLS: readable to active store roles, mutation restricted to store managers. Service role remains the server mutation path.
do $$declare t text;p record;col text;begin
 foreach t in array array['customer_journeys','customer_journey_steps','customer_lifecycle_milestones','control_alerts','control_alert_events','control_tasks','control_processing_runs','action_proposals','action_proposal_events','action_approvals','action_executions','action_processing_runs','automation_processing_runs','automation_runbook_instances'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t);end loop;
  execute format('create policy %I on public.%I for select to authenticated using(public.can_read_merchant_intelligence(instance_id))',t||'_tenant_read',t);
  execute format('create policy %I on public.%I for all to authenticated using(public.can_manage_merchant_intelligence(instance_id)) with check(public.can_manage_merchant_intelligence(instance_id))',t||'_tenant_manage',t);
 end loop;
 foreach t in array array['automation_step_runs','automation_events'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t);end loop;
  execute format('create policy %I on public.%I for select to authenticated using(public.can_read_merchant_intelligence(store_instance_id))',t||'_tenant_read',t);
  execute format('create policy %I on public.%I for all to authenticated using(public.can_manage_merchant_intelligence(store_instance_id)) with check(public.can_manage_merchant_intelligence(store_instance_id))',t||'_tenant_manage',t);
 end loop;
end$$;
