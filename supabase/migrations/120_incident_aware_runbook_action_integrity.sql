-- V15 cross-version hardening: new V13 incident => new V14 proposal and new V15 runbook.
create or replace function public.plan_action_proposals(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare a record;p record;v_count integer:=0;v_rank integer;v_min integer;v_min_priority integer;v_incident text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged','snoozed') loop
  v_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;v_incident:=to_char(a.incident_started_at at time zone 'UTC','YYYYMMDDHH24MISSUS');
  for p in select distinct on(policy_key) * from public.action_policies where enabled and category=a.category and(alert_type is null or alert_type=a.alert_type) order by policy_key,version desc loop
   v_min:=case p.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;v_min_priority:=coalesce((p.conditions->>'min_priority_score')::integer,0);if v_rank<v_min or a.priority_score<v_min_priority then continue;end if;
   insert into public.action_proposals(proposal_key,alert_id,policy_id,action_kind,impact_class,risk_score,rationale,proposed_payload,source_snapshot,expires_at)
   values('alert:'||a.id::text||':incident:'||v_incident||':policy:'||p.policy_key||':v'||p.version,a.id,p.id,p.action_kind,p.impact_class,least(100,greatest(a.priority_score,case p.impact_class when 'high_impact' then 85 when 'reversible' then 60 else 30 end)),'V15 incident-aware policy '||p.policy_key||' matched active V13 alert '||a.alert_key,p.action_template,jsonb_build_object('alert_key',a.alert_key,'alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'evidence',a.evidence),now()+(p.expires_after_hours||' hours')::interval)
   on conflict(proposal_key) do update set risk_score=excluded.risk_score,rationale=excluded.rationale,source_snapshot=excluded.source_snapshot,updated_at=now() where public.action_proposals.status in ('proposed','simulated');if found then v_count:=v_count+1;end if;
  end loop;
 end loop;return jsonb_build_object('proposals_upserted',v_count,'incident_aware',true);end;$$;
revoke all on function public.plan_action_proposals(text) from public,anon,authenticated;grant execute on function public.plan_action_proposals(text) to service_role;

create or replace function public.simulate_action_proposal(p_proposal_id uuid,p_actor_id uuid,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path=''
as $$declare p public.action_proposals;a public.control_alerts;pol public.action_policies;v_hash text;v_snapshot jsonb;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;
 if p.status not in ('proposed','simulated') then raise exception 'proposal_not_simulatable';end if;if p.expires_at<=now() then raise exception 'proposal_expired';end if;select * into a from public.control_alerts where id=p.alert_id;select * into pol from public.action_policies where id=p.policy_id;
 if a.status in ('resolved','dismissed') or not pol.enabled or p.created_at<a.incident_started_at then raise exception 'source_or_policy_stale';end if;
 v_snapshot:=jsonb_build_object('alert_id',a.id,'alert_key',a.alert_key,'status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'evidence',a.evidence,'policy_id',pol.id,'policy_version',pol.version,'proposal_payload',p.proposed_payload,'simulated_at',now());v_hash:=md5(v_snapshot::text);
 update public.action_proposals set status='simulated',simulation_snapshot=v_snapshot,simulation_hash=v_hash,simulated_at=now(),updated_at=now() where id=p.id returning * into p;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'simulated',case when p.status='simulated' then 'simulated' else 'proposed' end,'simulated',p_actor_id,jsonb_build_object('simulation_hash',v_hash,'incident_started_at',a.incident_started_at)) on conflict(event_key) do nothing;return p;end;$$;
revoke all on function public.simulate_action_proposal(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.simulate_action_proposal(uuid,uuid,text) to service_role;

create or replace function public.action_proposal_is_stale(p_proposal_id uuid)
returns boolean language sql security definer set search_path=''
as $$select case when p.simulated_at is null then true when a.last_detected_at>p.simulated_at then true when a.status in ('resolved','dismissed') then true when not pol.enabled then true when p.created_at<a.incident_started_at then true when p.source_snapshot ? 'incident_started_at' and (p.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then true else false end from public.action_proposals p join public.control_alerts a on a.id=p.alert_id join public.action_policies pol on pol.id=p.policy_id where p.id=p_proposal_id$$;
revoke all on function public.action_proposal_is_stale(uuid) from public,anon,authenticated;grant execute on function public.action_proposal_is_stale(uuid) to service_role;

create or replace function public.plan_automation_runbooks(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare a record;r public.automation_runbooks;v_proposal uuid;v_instance uuid;v_created integer:=0;v_existing integer:=0;v_key text;v_incident text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged') and severity in ('warning','high','critical') loop
   select rb.* into r from public.automation_runbooks rb where rb.enabled=true and rb.category=a.category and(case rb.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end)<=(case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end) order by rb.version desc limit 1;if not found then continue;end if;
   v_proposal:=null;select ap.id into v_proposal from public.action_proposals ap where ap.alert_id=a.id and ap.created_at>=a.incident_started_at and ap.status in ('simulated','approved','executed') order by ap.created_at desc limit 1;
   v_incident:=to_char(a.incident_started_at at time zone 'UTC','YYYYMMDDHH24MISSUS');v_key:='alert:'||a.id::text||':incident:'||v_incident||':runbook:'||r.runbook_key||':v'||r.version::text;
   if exists(select 1 from public.automation_runbook_instances where instance_key=v_key) then v_existing:=v_existing+1;continue;end if;
   insert into public.automation_runbook_instances(instance_key,runbook_id,alert_id,proposal_id,status,source_snapshot,deadline_at) values(v_key,r.id,a.id,v_proposal,'planned',jsonb_build_object('alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'proposal_id',v_proposal),now()+make_interval(hours=>r.max_duration_hours)) returning id into v_instance;
   insert into public.automation_step_runs(instance_id,step_id,status) select v_instance,s.id,case when s.step_order=1 then 'ready' else 'pending' end from public.automation_runbook_steps s where s.runbook_id=r.id order by s.step_order;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('planned:'||p_run_key||':'||v_instance::text,v_instance,'planned',jsonb_build_object('runbook_key',r.runbook_key,'runbook_version',r.version,'source_alert_id',a.id,'incident_started_at',a.incident_started_at));v_created:=v_created+1;
 end loop;return jsonb_build_object('created',v_created,'existing',v_existing,'incident_aware',true);end;$$;
revoke all on function public.plan_automation_runbooks(text) from public,anon,authenticated;grant execute on function public.plan_automation_runbooks(text) to service_role;

create or replace function public.cancel_stale_automation_incidents(p_run_key text)
returns integer language plpgsql security definer set search_path=''
as $$declare i record;v_count integer:=0;begin
 for i in select ai.id,ai.alert_id,ai.source_snapshot,ca.incident_started_at from public.automation_runbook_instances ai join public.control_alerts ca on ca.id=ai.alert_id where ai.status in ('planned','active','paused') loop
   if not(i.source_snapshot ? 'incident_started_at') or (i.source_snapshot->>'incident_started_at')::timestamptz is distinct from i.incident_started_at then
     update public.automation_runbook_instances set status='cancelled',cancelled_at=now(),updated_at=now() where id=i.id;update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('incident-stale:'||p_run_key||':'||i.id::text,i.id,'cancelled',jsonb_build_object('reason','source_incident_changed')) on conflict(event_key) do nothing;v_count:=v_count+1;
   end if;
 end loop;return v_count;end;$$;
revoke all on function public.cancel_stale_automation_incidents(text) from public,anon,authenticated;grant execute on function public.cancel_stale_automation_incidents(text) to service_role;

create or replace function public.process_automation_cycle(p_run_key text)
returns public.automation_processing_runs language plpgsql security definer set search_path=''
as $$declare x public.automation_processing_runs;v_stale integer;v_plan jsonb;v_rec jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-cycle:'||p_run_key,0));select * into x from public.automation_processing_runs where run_key=p_run_key;if found and x.completed_at is not null then return x;end if;if not found then insert into public.automation_processing_runs(run_key) values(p_run_key) returning * into x;end if;
 select public.cancel_stale_automation_incidents(p_run_key) into v_stale;select public.plan_automation_runbooks(p_run_key) into v_plan;select public.reconcile_automation_runbooks(p_run_key) into v_rec;v_rec:=v_rec||jsonb_build_object('stale_incidents_cancelled',v_stale);
 update public.automation_processing_runs set planned=v_plan,reconciled=v_rec,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('cancel_stale_incidents','plan','reconcile')) where id=x.id returning * into x;return x;end;$$;
revoke all on function public.process_automation_cycle(text) from public,anon,authenticated;grant execute on function public.process_automation_cycle(text) to service_role;
