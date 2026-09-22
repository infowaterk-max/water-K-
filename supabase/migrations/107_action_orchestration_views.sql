-- V14: seeded safe policies, orchestration and admin read models.
insert into public.action_policies(policy_key,version,name,category,min_severity,action_kind,impact_class,approval_mode,expires_after_hours,action_template)
values
('ops-critical-human-review',1,'Kritikus műveleti emberi felülvizsgálat','operations','high','human_task','reversible','single',24,jsonb_build_object('title','Műveleti kivétel felülvizsgálata')),
('inventory-pressure-review',1,'Készletnyomás felülvizsgálata','inventory','warning','human_task','advisory','single',48,jsonb_build_object('title','Készletnyomás ellenőrzése')),
('commercial-high-value-review',1,'Magas értékű kereskedelmi döntés','commercial','high','record_decision','high_impact','dual',24,jsonb_build_object('title','Kereskedelmi döntés jóváhagyása')),
('service-critical-review',1,'Kritikus ügyfélszolgálati ügy','service','high','human_task','reversible','single',12,jsonb_build_object('title','Ügyfélszolgálati ügy kezelése')),
('customer-value-review',1,'Ügyfélérték kontroll','customer','warning','record_decision','advisory','single',48,jsonb_build_object('title','Ügyfélérték jelzés felülvizsgálata')),
('system-critical-review',1,'Rendszerhiba kontroll','system','high','human_task','reversible','single',8,jsonb_build_object('title','Rendszerhiba kivizsgálása'))
on conflict(policy_key,version) do nothing;

create table if not exists public.action_processing_runs(id uuid primary key default gen_random_uuid(),run_key text not null unique,started_at timestamptz not null default now(),completed_at timestamptz,plan_result jsonb not null default '{}'::jsonb,cleanup_result jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb);
alter table public.action_processing_runs enable row level security;revoke all on public.action_processing_runs from public,anon,authenticated;grant select,insert,update on public.action_processing_runs to service_role;

create or replace function public.process_action_cycle(p_run_key text)
returns public.action_processing_runs language plpgsql security definer set search_path=''
as $$declare r public.action_processing_runs;v_plan jsonb;v_clean jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-cycle:'||p_run_key,0));
 select * into r from public.action_processing_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;
 if not found then insert into public.action_processing_runs(run_key) values(p_run_key) returning * into r;end if;
 select public.expire_or_cancel_action_proposals(p_run_key) into v_clean;select public.plan_action_proposals(p_run_key) into v_plan;
 update public.action_processing_runs set cleanup_result=v_clean,plan_result=v_plan,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('expire_cancel','plan')) where id=r.id returning * into r;return r;end;$$;
revoke all on function public.process_action_cycle(text) from public,anon,authenticated;grant execute on function public.process_action_cycle(text) to service_role;

create or replace view public.action_center_queue with(security_invoker=true) as
select p.id as proposal_id,p.proposal_key,p.status,p.action_kind,p.impact_class,p.risk_score,p.rationale,p.expires_at,p.simulated_at,p.approved_at,p.executed_at,
 a.id as alert_id,a.alert_key,a.category,a.alert_type,a.severity,a.priority_score as alert_priority,a.title as alert_title,a.status as alert_status,
 pol.policy_key,pol.version as policy_version,pol.name as policy_name,pol.approval_mode,
 (select count(*) from public.action_approvals x where x.proposal_id=p.id and x.decision='approved')::integer as approval_count,
 public.action_proposal_is_stale(p.id) as simulation_stale
from public.action_proposals p join public.control_alerts a on a.id=p.alert_id join public.action_policies pol on pol.id=p.policy_id
where p.status in ('proposed','simulated','approved');
revoke all on public.action_center_queue from public,anon,authenticated;grant select on public.action_center_queue to service_role;

create or replace view public.action_center_kpis with(security_invoker=true) as
select count(*)::integer as active_proposals,count(*) filter(where status='proposed')::integer as proposed_count,count(*) filter(where status='simulated')::integer as simulated_count,count(*) filter(where status='approved')::integer as approved_count,count(*) filter(where impact_class='high_impact')::integer as high_impact_count,count(*) filter(where expires_at<now()+interval '4 hours')::integer as expiring_soon_count,count(*) filter(where public.action_proposal_is_stale(id))::integer as stale_count from public.action_proposals where status in ('proposed','simulated','approved');
revoke all on public.action_center_kpis from public,anon,authenticated;grant select on public.action_center_kpis to service_role;
