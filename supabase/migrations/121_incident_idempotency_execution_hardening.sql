-- V15 audit hardening: preserve V14 simulation idempotency and prevent stale/high-impact runbook attachment.
create or replace function public.simulate_action_proposal(p_proposal_id uuid,p_actor_id uuid,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path=''
as $$declare p public.action_proposals;a public.control_alerts;pol public.action_policies;ev record;v_hash text;v_snapshot jsonb;v_from text;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select proposal_id into ev from public.action_proposal_events where event_key=p_event_key;if found then if ev.proposal_id<>p_proposal_id then raise exception 'event_key_conflict';end if;select * into p from public.action_proposals where id=p_proposal_id;return p;end if;
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;if p.status not in ('proposed','simulated') then raise exception 'proposal_not_simulatable';end if;if p.expires_at<=now() then raise exception 'proposal_expired';end if;
 select * into a from public.control_alerts where id=p.alert_id;select * into pol from public.action_policies where id=p.policy_id;if a.status in ('resolved','dismissed') or not pol.enabled or p.created_at<a.incident_started_at then raise exception 'source_or_policy_stale';end if;v_from:=p.status;
 v_snapshot:=jsonb_build_object('alert_id',a.id,'alert_key',a.alert_key,'status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'evidence',a.evidence,'policy_id',pol.id,'policy_version',pol.version,'proposal_payload',p.proposed_payload,'simulated_at',now());v_hash:=md5(v_snapshot::text);
 update public.action_proposals set status='simulated',simulation_snapshot=v_snapshot,simulation_hash=v_hash,simulated_at=now(),updated_at=now() where id=p.id returning * into p;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'simulated',v_from,'simulated',p_actor_id,jsonb_build_object('simulation_hash',v_hash,'incident_started_at',a.incident_started_at));return p;end;$$;
revoke all on function public.simulate_action_proposal(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.simulate_action_proposal(uuid,uuid,text) to service_role;

create or replace function public.plan_automation_runbooks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare a record;r public.automation_runbooks;v_proposal uuid;v_instance uuid;v_created integer:=0;v_existing integer:=0;v_waiting integer:=0;v_key text;v_incident text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged') and severity in ('warning','high','critical') loop
   select rb.* into r from public.automation_runbooks rb where rb.enabled=true and rb.category=a.category and(case rb.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end)<=(case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end) order by rb.version desc limit 1;if not found then continue;end if;
   v_proposal:=null;select ap.id into v_proposal from public.action_proposals ap where ap.alert_id=a.id and ap.created_at>=a.incident_started_at and ap.status in ('simulated','approved','executed') order by ap.created_at desc limit 1;
   if r.requires_action_approval and v_proposal is null then v_waiting:=v_waiting+1;continue;end if;
   v_incident:=to_char(a.incident_started_at at time zone 'UTC','YYYYMMDDHH24MISSUS');v_key:='alert:'||a.id::text||':incident:'||v_incident||':runbook:'||r.runbook_key||':v'||r.version::text;
   if exists(select 1 from public.automation_runbook_instances where instance_key=v_key) then v_existing:=v_existing+1;continue;end if;
   insert into public.automation_runbook_instances(instance_key,runbook_id,alert_id,proposal_id,status,source_snapshot,deadline_at) values(v_key,r.id,a.id,v_proposal,'planned',jsonb_build_object('alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'proposal_id',v_proposal),now()+make_interval(hours=>r.max_duration_hours)) returning id into v_instance;
   insert into public.automation_step_runs(instance_id,step_id,status) select v_instance,s.id,case when s.step_order=1 then 'ready' else 'pending' end from public.automation_runbook_steps s where s.runbook_id=r.id order by s.step_order;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('planned:'||p_run_key||':'||v_instance::text,v_instance,'planned',jsonb_build_object('runbook_key',r.runbook_key,'runbook_version',r.version,'source_alert_id',a.id,'incident_started_at',a.incident_started_at));v_created:=v_created+1;
 end loop;return jsonb_build_object('created',v_created,'existing',v_existing,'waiting_for_proposal',v_waiting,'incident_aware',true);end;$$;
revoke all on function public.plan_automation_runbooks(text) from public,anon,authenticated;grant execute on function public.plan_automation_runbooks(text) to service_role;

create or replace function public.guard_automation_step_source_current()
returns trigger language plpgsql security definer set search_path=''
as $$declare i public.automation_runbook_instances;a public.control_alerts;begin
 if new.status='running' and old.status is distinct from new.status then
   select * into i from public.automation_runbook_instances where id=new.instance_id;if i.status<>'active' then raise exception 'instance_not_active';end if;select * into a from public.control_alerts where id=i.alert_id;
   if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
   if not(i.source_snapshot ? 'incident_started_at') or (i.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then raise exception 'source_incident_stale';end if;
 end if;return new;end;$$;
revoke all on function public.guard_automation_step_source_current() from public,anon,authenticated;
drop trigger if exists guard_automation_step_source_current_trigger on public.automation_step_runs;create trigger guard_automation_step_source_current_trigger before update on public.automation_step_runs for each row execute function public.guard_automation_step_source_current();
