-- Additive tenant scope for merchant intelligence / journey / control domains.
-- Strict NOT NULL and RLS are intentionally deferred until all planner/control RPCs carry explicit instance_id.

alter table public.customer_journeys add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.customer_journey_steps add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.customer_lifecycle_milestones add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.control_alerts add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.control_alert_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.control_tasks add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.control_processing_runs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_policies add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_proposals add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_proposal_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_approvals add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_executions add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.action_processing_runs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.automation_control add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.automation_control_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.automation_processing_runs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.automation_runbook_instances add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

-- Deterministic legacy backfill where an authoritative parent exists.
update public.customer_journey_steps s set instance_id=j.instance_id from public.customer_journeys j where s.journey_id=j.id and s.instance_id is null and j.instance_id is not null;
update public.customer_lifecycle_milestones m set instance_id=o.instance_id from public.orders o where m.source_order_id=o.id and m.instance_id is null and o.instance_id is not null;
update public.control_alerts a set instance_id=o.instance_id from public.orders o where a.order_id=o.id and a.instance_id is null and o.instance_id is not null;
update public.control_alerts a set instance_id=v.instance_id from public.product_variants v where a.variant_id=v.id and a.instance_id is null and v.instance_id is not null;
update public.control_alerts a set instance_id=c.instance_id from public.commercial_opportunities c where a.opportunity_id=c.id and a.instance_id is null and c.instance_id is not null;
update public.control_alert_events e set instance_id=a.instance_id from public.control_alerts a where e.alert_id=a.id and e.instance_id is null and a.instance_id is not null;
update public.control_tasks t set instance_id=a.instance_id from public.control_alerts a where t.alert_id=a.id and t.instance_id is null and a.instance_id is not null;
update public.action_proposals p set instance_id=a.instance_id from public.control_alerts a where p.alert_id=a.id and p.instance_id is null and a.instance_id is not null;
update public.action_proposal_events e set instance_id=p.instance_id from public.action_proposals p where e.proposal_id=p.id and e.instance_id is null and p.instance_id is not null;
update public.action_approvals x set instance_id=p.instance_id from public.action_proposals p where x.proposal_id=p.id and x.instance_id is null and p.instance_id is not null;
update public.action_executions x set instance_id=p.instance_id from public.action_proposals p where x.proposal_id=p.id and x.instance_id is null and p.instance_id is not null;
update public.automation_runbook_instances r set instance_id=a.instance_id from public.control_alerts a where r.alert_id=a.id and r.instance_id is null and a.instance_id is not null;

-- Single-store compatibility for standalone configuration/run rows.
update public.customer_journeys set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.customer_lifecycle_milestones set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.control_processing_runs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.action_policies set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.action_processing_runs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.automation_control set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.automation_control_events set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.automation_processing_runs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;

create index if not exists customer_journeys_instance_idx on public.customer_journeys(instance_id);
create index if not exists customer_lifecycle_milestones_instance_idx on public.customer_lifecycle_milestones(instance_id,customer_id);
create index if not exists control_alerts_instance_status_idx on public.control_alerts(instance_id,status,priority_score desc);
create index if not exists control_tasks_instance_status_idx on public.control_tasks(instance_id,status,due_at);
create index if not exists action_proposals_instance_status_idx on public.action_proposals(instance_id,status,created_at desc);
create index if not exists automation_runbook_instances_instance_idx on public.automation_runbook_instances(instance_id,status);

create or replace view public.merchant_intelligence_tenant_gaps as
select 'customer_journeys'::text table_name,count(*)::bigint rows_without_instance from public.customer_journeys where instance_id is null
union all select 'customer_journey_steps',count(*) from public.customer_journey_steps where instance_id is null
union all select 'customer_lifecycle_milestones',count(*) from public.customer_lifecycle_milestones where instance_id is null
union all select 'control_alerts',count(*) from public.control_alerts where instance_id is null
union all select 'control_alert_events',count(*) from public.control_alert_events where instance_id is null
union all select 'control_tasks',count(*) from public.control_tasks where instance_id is null
union all select 'control_processing_runs',count(*) from public.control_processing_runs where instance_id is null
union all select 'action_policies',count(*) from public.action_policies where instance_id is null
union all select 'action_proposals',count(*) from public.action_proposals where instance_id is null
union all select 'action_proposal_events',count(*) from public.action_proposal_events where instance_id is null
union all select 'action_approvals',count(*) from public.action_approvals where instance_id is null
union all select 'action_executions',count(*) from public.action_executions where instance_id is null
union all select 'action_processing_runs',count(*) from public.action_processing_runs where instance_id is null
union all select 'automation_control',count(*) from public.automation_control where instance_id is null
union all select 'automation_control_events',count(*) from public.automation_control_events where instance_id is null
union all select 'automation_processing_runs',count(*) from public.automation_processing_runs where instance_id is null
union all select 'automation_runbook_instances',count(*) from public.automation_runbook_instances where instance_id is null;

comment on view public.merchant_intelligence_tenant_gaps is 'Preflight gate for the final merchant intelligence strict-tenant phase.';
