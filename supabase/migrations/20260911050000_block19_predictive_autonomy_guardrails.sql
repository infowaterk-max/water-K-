-- Roadmap Block 19 – Predictive Optimization & Autonomous Commerce Guardrails.
-- Governance/evidence only: this migration does not create a second pricing, promotion, inventory, catalog, customer or order authority.

create table if not exists public.commerce_autonomy_policies(
  instance_id uuid primary key references public.webshop_instances(id) on delete cascade,
  mode text not null default 'off' check(mode in ('off','supervised','bounded')),
  kill_switch boolean not null default true,
  min_confidence numeric(5,4) not null default 0.9000 check(min_confidence between 0 and 1),
  max_risk_score integer not null default 20 check(max_risk_score between 0 and 100),
  max_impact_net_huf numeric(14,2) not null default 0 check(max_impact_net_huf>=0),
  margin_floor_percent numeric(6,2) not null default 0 check(margin_floor_percent between 0 and 100),
  inventory_floor_quantity integer not null default 0 check(inventory_floor_quantity>=0),
  max_discount_percent numeric(6,2) not null default 0 check(max_discount_percent between 0 and 100),
  max_budget_net_huf numeric(14,2) not null default 0 check(max_budget_net_huf>=0),
  stale_after_minutes integer not null default 15 check(stale_after_minutes between 1 and 1440),
  allowed_actions text[] not null default '{}'::text[],
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(allowed_actions <@ array['workflow.inventory-pressure','workflow.customer-value-risk']::text[])
);

create table if not exists public.commerce_autonomy_runs(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  run_key text not null,
  prediction_key text not null,
  action_kind text not null check(action_kind in ('workflow.inventory-pressure','workflow.customer-value-risk','commerce.promotion-adjustment','commerce.inventory-adjustment','commerce.price-adjustment','commerce.merchandising-adjustment')),
  risk_class text not null check(risk_class in ('low','medium','high','critical')),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  risk_score integer not null check(risk_score between 0 and 100),
  expected_impact_net_huf numeric(14,2) not null default 0,
  status text not null check(status in ('blocked','supervised','approval_required','awaiting_approval','retry','dead_letter','completed','compensated')),
  proposal_id uuid references public.action_proposals(id) on delete restrict,
  workflow_run_key text,
  runbook_instance_id uuid references public.automation_runbook_instances(id) on delete restrict,
  policy_snapshot jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  compensated_at timestamptz,
  compensated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,run_key)
);
create index if not exists commerce_autonomy_runs_instance_created_idx on public.commerce_autonomy_runs(instance_id,created_at desc);
create index if not exists commerce_autonomy_runs_instance_status_idx on public.commerce_autonomy_runs(instance_id,status,created_at desc);

alter table public.commerce_autonomy_policies enable row level security;
alter table public.commerce_autonomy_runs enable row level security;
revoke all on public.commerce_autonomy_policies from public,anon,authenticated;
revoke all on public.commerce_autonomy_runs from public,anon,authenticated;
grant select,insert,update on public.commerce_autonomy_policies to service_role;
grant select,insert,update on public.commerce_autonomy_runs to service_role;

drop policy if exists tenant_read on public.commerce_autonomy_policies;
create policy tenant_read on public.commerce_autonomy_policies for select to authenticated
using(public.has_store_role(instance_id,array['owner','admin','analyst','viewer'],auth.uid()));
drop policy if exists tenant_read on public.commerce_autonomy_runs;
create policy tenant_read on public.commerce_autonomy_runs for select to authenticated
using(public.has_store_role(instance_id,array['owner','admin','analyst','viewer'],auth.uid()));

-- Existing action_proposals remains the only human-approval authority for high-risk predicted actions.
insert into public.action_policies(policy_key,version,name,category,alert_type,min_severity,action_kind,impact_class,approval_mode,expires_after_hours,enabled,action_template,conditions)
values('block19-high-risk-commerce-review',1,'Block 19 magas kockázatú kereskedelmi felülvizsgálat','commercial','block19.predictive.high_risk','high','record_decision','high_impact','dual',24,true,jsonb_build_object('title','Prediktív kereskedelmi döntés jóváhagyása'),jsonb_build_object('authority','block19','unattended',false))
on conflict(policy_key,version) do nothing;

create or replace function public.create_block19_action_proposal_v1(
  p_instance_id uuid,
  p_actor_id uuid,
  p_prediction_key text,
  p_requested_action_kind text,
  p_risk_score integer,
  p_rationale text,
  p_source_snapshot jsonb,
  p_proposed_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_policy public.action_policies;
  v_alert public.control_alerts;
  v_proposal public.action_proposals;
  v_alert_key text;
  v_proposal_key text;
begin
  if p_instance_id is null or p_actor_id is null then raise exception 'BLOCK19_IDENTITY_REQUIRED'; end if;
  if not public.is_platform_operator(p_actor_id) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor_id) then raise exception 'BLOCK19_PERMISSION_REQUIRED'; end if;
  if nullif(trim(p_prediction_key),'') is null or length(p_prediction_key)>180 then raise exception 'BLOCK19_PREDICTION_KEY_INVALID'; end if;
  if p_requested_action_kind not in ('commerce.promotion-adjustment','commerce.inventory-adjustment','commerce.price-adjustment','commerce.merchandising-adjustment') then raise exception 'BLOCK19_HIGH_RISK_ACTION_INVALID'; end if;
  if p_risk_score is null or p_risk_score<0 or p_risk_score>100 then raise exception 'BLOCK19_RISK_INVALID'; end if;
  if p_risk_score<70 then raise exception 'BLOCK19_HIGH_RISK_THRESHOLD_REQUIRED'; end if;

  select * into v_policy from public.action_policies where policy_key='block19-high-risk-commerce-review' and version=1 and enabled=true;
  if not found then raise exception 'BLOCK19_ACTION_POLICY_MISSING'; end if;
  v_alert_key:='block19:'||left(p_prediction_key,160);
  insert into public.control_alerts(instance_id,alert_key,category,alert_type,severity,priority_score,title,description,recommended_action,evidence)
  values(p_instance_id,v_alert_key,'commercial','block19.predictive.high_risk','high',greatest(70,p_risk_score),'Prediktív kereskedelmi döntés felülvizsgálata',left(coalesce(nullif(trim(p_rationale),''),'Magas kockázatú prediktív kereskedelmi művelet.'),500),'Az Intézkedési központ existing approval flow-jában dönts.',coalesce(p_source_snapshot,'{}'::jsonb)||jsonb_build_object('requestedActionKind',p_requested_action_kind,'predictionKey',p_prediction_key,'authority','block19'))
  on conflict(instance_id,alert_key) do update set last_detected_at=now(),updated_at=now(),priority_score=greatest(public.control_alerts.priority_score,excluded.priority_score),evidence=excluded.evidence
  returning * into v_alert;

  v_proposal_key:='block19:'||left(p_prediction_key,150)||':v1';
  select * into v_proposal from public.action_proposals where instance_id=p_instance_id and proposal_key=v_proposal_key;
  if found then return v_proposal.id; end if;

  insert into public.action_proposals(instance_id,proposal_key,alert_id,policy_id,status,action_kind,impact_class,risk_score,rationale,proposed_payload,source_snapshot,expires_at)
  values(p_instance_id,v_proposal_key,v_alert.id,v_policy.id,'proposed','record_decision','high_impact',p_risk_score,left(coalesce(p_rationale,'Block 19 high-risk predicted action'),1000),coalesce(p_proposed_payload,'{}'::jsonb)||jsonb_build_object('requestedActionKind',p_requested_action_kind),coalesce(p_source_snapshot,'{}'::jsonb),now()+interval '24 hours')
  on conflict(instance_id,proposal_key) do nothing
  returning * into v_proposal;
  if v_proposal.id is null then select * into v_proposal from public.action_proposals where instance_id=p_instance_id and proposal_key=v_proposal_key; end if;
  if v_proposal.id is null then raise exception 'BLOCK19_PROPOSAL_CREATE_FAILED'; end if;
  return v_proposal.id;
end;$$;
revoke all on function public.create_block19_action_proposal_v1(uuid,uuid,text,text,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_block19_action_proposal_v1(uuid,uuid,text,text,integer,text,jsonb,jsonb) to service_role;

comment on table public.commerce_autonomy_policies is 'Block 19 per-tenant autonomy guardrail policy. Default is off + kill-switch engaged; no commerce-domain mutation authority.';
comment on table public.commerce_autonomy_runs is 'Block 19 prediction/guard/execution evidence ledger. Domain execution remains delegated to canonical Block 17 runbooks or existing action_proposals approval.';
