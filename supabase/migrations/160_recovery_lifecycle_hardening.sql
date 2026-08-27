-- V19 final lifecycle hardening.
create or replace function public.upsert_recovery_finding(p_objective_id uuid,p_finding_type text,p_severity text,p_title text,p_description text,p_run_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.recovery_objectives;v_key text;v public.recovery_findings;v_id uuid;v_event text;begin
 select * into o from public.recovery_objectives where id=p_objective_id;if not found then raise exception 'Recovery objective nem található.';end if;v_key:='recovery:'||o.service_key||':'||p_finding_type;
 select * into v from public.recovery_findings where finding_key=v_key for update;
 if not found then insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,p_objective_id,p_finding_type,p_severity,p_title,p_description) returning id into v_id;v_event:='finding_opened';
 elsif v.status='resolved' then update public.recovery_findings set status='open',severity=p_severity,title=p_title,description=p_description,occurrence_count=occurrence_count+1,last_detected_at=now(),acknowledged_by=null,resolved_by=null,updated_at=now() where id=v.id;v_id:=v.id;v_event:='finding_reopened';
 else update public.recovery_findings set severity=p_severity,title=p_title,description=p_description,last_detected_at=now(),updated_at=now() where id=v.id;v_id:=v.id;v_event:=null;end if;
 if v_event is not null then insert into public.recovery_events(event_key,objective_id,finding_id,event_type,metadata) values(p_run_key||':'||v_key||':'||v_event,p_objective_id,v_id,v_event,jsonb_build_object('run_key',p_run_key)) on conflict(event_key) do nothing;end if;return v_id;
end;$$;

create or replace function public.plan_recovery_drill(p_service_key text,p_scenario text,p_planned_at timestamptz,p_actor_id uuid,p_drill_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_objective public.recovery_objectives;v public.recovery_drills;v_id uuid;begin
 select * into v_objective from public.recovery_objectives where service_key=p_service_key and enabled order by version desc limit 1;if not found then raise exception 'Nincs aktív recovery objective.';end if;
 select * into v from public.recovery_drills where drill_key=p_drill_key;if found then if v.objective_id<>v_objective.id or v.scenario<>p_scenario or v.planned_at<>p_planned_at then raise exception 'A drill_key már más recovery drillhez tartozik.';end if;return v.id;end if;
 insert into public.recovery_drills(drill_key,objective_id,scenario,planned_at,created_by) values(p_drill_key,v_objective.id,p_scenario,p_planned_at,p_actor_id) returning id into v_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id,metadata) values('planned:'||p_drill_key,v_objective.id,v_id,'drill_planned',p_actor_id,jsonb_build_object('scenario',p_scenario,'planned_at',p_planned_at)) on conflict(event_key) do nothing;return v_id;
end;$$;

create or replace function public.complete_recovery_drill(p_drill_id uuid,p_actor_id uuid,p_measured_rto integer,p_measured_rpo integer,p_restore_validated boolean,p_result jsonb,p_event_key text)
returns text language plpgsql security definer set search_path='' as $$
declare v public.recovery_drills;o public.recovery_objectives;e public.recovery_events;v_status text;begin
 select * into e from public.recovery_events where event_key=p_event_key;if found then if e.drill_id is distinct from p_drill_id or e.event_type not in('drill_passed','drill_failed') or coalesce((e.metadata->>'measured_rto')::integer,-1)<>p_measured_rto or coalesce((e.metadata->>'measured_rpo')::integer,-1)<>p_measured_rpo or coalesce((e.metadata->>'restore_validated')::boolean,false)<>p_restore_validated then raise exception 'Az event_key már más recovery eredményhez tartozik.';end if;select status into v_status from public.recovery_drills where id=p_drill_id;return v_status;end if;
 select * into v from public.recovery_drills where id=p_drill_id for update;if not found then raise exception 'Drill nem található.';end if;if v.status in('passed','failed') then raise exception 'A drill már lezárt, más idempotency kulccsal.';end if;if v.status<>'running' then raise exception 'Csak futó drill zárható.';end if;
 select * into o from public.recovery_objectives where id=v.objective_id;v_status:=case when p_restore_validated and p_measured_rto<=o.rto_minutes and p_measured_rpo<=o.rpo_minutes then 'passed' else 'failed' end;
 update public.recovery_drills set status=v_status,completed_at=now(),measured_rto_minutes=p_measured_rto,measured_rpo_minutes=p_measured_rpo,restore_validated=p_restore_validated,result=coalesce(p_result,'{}'::jsonb),updated_at=now() where id=p_drill_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id,metadata) values(p_event_key,v.objective_id,p_drill_id,case when v_status='passed' then 'drill_passed' else 'drill_failed' end,p_actor_id,jsonb_build_object('measured_rto',p_measured_rto,'measured_rpo',p_measured_rpo,'restore_validated',p_restore_validated));return v_status;
end;$$;
