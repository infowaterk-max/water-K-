-- V15: default governed runbooks, deterministic planner and activation gates.
insert into public.automation_runbooks(runbook_key,version,name,category,min_severity,risk_class,requires_action_approval,max_duration_hours,max_failures,definition)
values
 ('operations-triage',1,'Műveleti kivétel kezelése','operations','warning','controlled',false,24,3,jsonb_build_object('purpose','Operációs kivétel kontrollált kivizsgálása')),
 ('inventory-pressure',1,'Készletnyomás kezelése','inventory','warning','controlled',false,24,3,jsonb_build_object('purpose','Készletkockázat emberi felülvizsgálata')),
 ('service-escalation',1,'Ügyfélszolgálati eszkaláció','service','high','controlled',false,24,3,jsonb_build_object('purpose','Magas prioritású ügyfélszolgálati eset követése')),
 ('commercial-high-risk',1,'Magas kockázatú kereskedelmi döntés','commercial','high','high_impact',true,48,2,jsonb_build_object('purpose','Jóváhagyott kereskedelmi intézkedés kontrollált utánkövetése')),
 ('customer-value-risk',1,'Ügyfélérték kockázat kezelése','customer','high','controlled',false,48,3,jsonb_build_object('purpose','Ügyfélérték/loyalty kockázat emberi kezelése')),
 ('system-recovery',1,'Rendszerhiba helyreállítás','system','high','controlled',false,12,3,jsonb_build_object('purpose','Integrációs vagy rendszerhiba kontrollált kezelése'))
on conflict(runbook_key,version) do nothing;

insert into public.automation_runbook_steps(runbook_id,step_key,step_order,name,action_kind,timeout_minutes,max_attempts,retry_backoff_minutes,payload_template)
select r.id,s.step_key,s.step_order,s.name,s.action_kind,s.timeout_minutes,s.max_attempts,s.retry_backoff_minutes,s.payload_template
from public.automation_runbooks r
cross join lateral(values
 ('notify',1,'Felelős admin értesítése','notify_admin',30,2,10,jsonb_build_object('kind','admin_attention')),
 ('review',2,'Forráshelyzet emberi ellenőrzése','human_task',240,2,30,jsonb_build_object('kind','source_review')),
 ('decision',3,'Döntés és eredmény rögzítése','record_decision',1440,1,60,jsonb_build_object('kind','decision_record'))
) as s(step_key,step_order,name,action_kind,timeout_minutes,max_attempts,retry_backoff_minutes,payload_template)
where r.version=1
on conflict(runbook_id,step_key) do nothing;

create or replace function public.plan_automation_runbooks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare a record;r public.automation_runbooks;p uuid;v_created integer:=0;v_existing integer:=0;v_key text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged') and severity in ('warning','high','critical') loop
   select rb.* into r from public.automation_runbooks rb
   where rb.enabled=true and rb.category=a.category
     and (case rb.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end)<=
         (case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end)
   order by rb.version desc limit 1;
   if not found then continue;end if;
   p:=null;
   select ap.id into p from public.action_proposals ap where ap.alert_id=a.id and ap.status in ('simulated','approved','executed') order by ap.created_at desc limit 1;
   v_key:='alert:'||a.id::text||':runbook:'||r.runbook_key||':v'||r.version::text;
   if exists(select 1 from public.automation_runbook_instances where instance_key=v_key) then v_existing:=v_existing+1;continue;end if;
   insert into public.automation_runbook_instances(instance_key,runbook_id,alert_id,proposal_id,status,source_snapshot,deadline_at)
   values(v_key,r.id,a.id,p,'planned',jsonb_build_object('alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'proposal_id',p),now()+make_interval(hours=>r.max_duration_hours))
   returning id into p;
   insert into public.automation_step_runs(instance_id,step_id,status)
   select p,s.id,case when s.step_order=1 then 'ready' else 'pending' end from public.automation_runbook_steps s where s.runbook_id=r.id order by s.step_order;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('planned:'||p_run_key||':'||p::text,p,'planned',jsonb_build_object('runbook_key',r.runbook_key,'runbook_version',r.version,'source_alert_id',a.id));
   v_created:=v_created+1;
 end loop;
 return jsonb_build_object('created',v_created,'existing',v_existing);
end;$$;
revoke all on function public.plan_automation_runbooks(text) from public,anon,authenticated;grant execute on function public.plan_automation_runbooks(text) to service_role;

create or replace function public.activate_automation_runbook(p_instance_id uuid,p_actor_id uuid,p_event_key text)
returns public.automation_runbook_instances language plpgsql security definer set search_path=''
as $$
declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;c public.automation_control;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;
 if i.status='active' then return i;end if;if i.status<>'planned' then raise exception 'instance_not_activatable';end if;
 select * into c from public.automation_control where singleton=true;
 if c.global_paused or (c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;
 select * into r from public.automation_runbooks where id=i.runbook_id;
 if not r.enabled then raise exception 'runbook_disabled';end if;
 select * into a from public.control_alerts where id=i.alert_id;
 if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
 if r.requires_action_approval then
   if i.proposal_id is null then raise exception 'approved_action_required';end if;
   select * into p from public.action_proposals where id=i.proposal_id;
   if p.status not in ('approved','executed') then raise exception 'approved_action_required';end if;
 end if;
 update public.automation_runbook_instances set status='active',started_at=coalesce(started_at,now()),paused_at=null,updated_at=now() where id=i.id returning * into i;
 insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values(p_event_key,i.id,'activated',p_actor_id,jsonb_build_object('runbook_id',i.runbook_id));
 return i;
end;$$;
revoke all on function public.activate_automation_runbook(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.activate_automation_runbook(uuid,uuid,text) to service_role;
