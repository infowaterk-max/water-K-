-- V16: default controls and deterministic check engine.
insert into public.assurance_controls(control_key,version,name,category,severity,weight,freshness_minutes,check_kind,definition)
values
 ('control-critical-aging',1,'Kritikus kontrolljelzések SLA-ja','control','critical',25,30,'queue_health',jsonb_build_object('max_age_hours',4)),
 ('action-stale-approved',1,'Jóváhagyott intézkedések frissessége','action','critical',20,30,'governance','{}'::jsonb),
 ('action-dual-approval',1,'Kettős jóváhagyás integritása','action','critical',20,60,'governance','{}'::jsonb),
 ('automation-circuit-health',1,'Automatizálási circuit breaker','automation','high',15,30,'queue_health','{}'::jsonb),
 ('automation-overdue',1,'Lejárt automatizálási SLA','automation','high',10,30,'queue_health','{}'::jsonb),
 ('automation-waiting-task',1,'Várakozó emberi feladatok állapota','automation','high',10,30,'queue_health','{}'::jsonb),
 ('control-overdue-task',1,'Lejárt kontrollfeladatok','control','high',10,30,'queue_health','{}'::jsonb),
 ('action-expired-active',1,'Lejárt aktív intézkedések','action','high',10,30,'governance','{}'::jsonb)
on conflict(control_key,version) do nothing;

create or replace function public.evaluate_assurance_control(p_control_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare c public.assurance_controls;v_count integer:=0;v_details jsonb:='{}'::jsonb;v_observed timestamptz:=now();begin
 select * into c from public.assurance_controls where id=p_control_id;if not found then raise exception 'control_not_found';end if;
 case c.control_key
  when 'control-critical-aging' then
   select count(*),coalesce(max(last_detected_at),now()) into v_count,v_observed from public.control_alerts where status in ('open','acknowledged','snoozed') and severity='critical' and incident_started_at<now()-make_interval(hours=>coalesce((c.definition->>'max_age_hours')::integer,4));
   v_details:=jsonb_build_object('violations',v_count,'max_age_hours',coalesce((c.definition->>'max_age_hours')::integer,4));
  when 'action-stale-approved' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.action_proposals where status='approved' and public.action_proposal_is_stale(id);
   v_details:=jsonb_build_object('stale_approved_proposals',v_count);
  when 'action-dual-approval' then
   select count(*) into v_count from public.action_proposals p join public.action_policies pol on pol.id=p.policy_id
   where pol.approval_mode='dual' and p.status in ('approved','executed') and (select count(distinct aa.approver_id) from public.action_approvals aa where aa.proposal_id=p.id and aa.decision='approved')<2;
   v_details:=jsonb_build_object('invalid_dual_approvals',v_count);
  when 'automation-circuit-health' then
   select case when global_paused or(circuit_open_until is not null and circuit_open_until>now()) then 1 else 0 end,updated_at into v_count,v_observed from public.automation_control where singleton=true;
   v_details:=(select jsonb_build_object('global_paused',global_paused,'pause_reason',pause_reason,'consecutive_failures',consecutive_failures,'circuit_open_until',circuit_open_until) from public.automation_control where singleton=true);
  when 'automation-overdue' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.automation_runbook_instances where status in ('planned','active','paused') and deadline_at<now();
   v_details:=jsonb_build_object('overdue_instances',v_count);
  when 'automation-waiting-task' then
   select count(*),coalesce(max(sr.updated_at),now()) into v_count,v_observed from public.automation_step_runs sr join public.automation_runbook_instances i on i.id=sr.instance_id
   where sr.status='waiting' and i.status='active' and sr.started_at<now()-interval '24 hours';
   v_details:=jsonb_build_object('waiting_over_24h',v_count);
  when 'control-overdue-task' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.control_tasks where status in ('open','in_progress') and due_at<now();
   v_details:=jsonb_build_object('overdue_control_tasks',v_count);
  when 'action-expired-active' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.action_proposals where status in ('proposed','simulated','approved') and expires_at<=now();
   v_details:=jsonb_build_object('expired_active_proposals',v_count);
  else raise exception 'unsupported_control_key:%',c.control_key;
 end case;
 return jsonb_build_object('passed',v_count=0,'violations',v_count,'details',v_details,'source_observed_at',v_observed);
end;$$;
revoke all on function public.evaluate_assurance_control(uuid) from public,anon,authenticated;
grant execute on function public.evaluate_assurance_control(uuid) to service_role;

create or replace function public.process_assurance_cycle(p_run_key text)
returns public.assurance_runs language plpgsql security definer set search_path=''
as $$
declare r public.assurance_runs;c public.assurance_controls;v jsonb;e public.assurance_evidence;f public.assurance_findings;v_checked integer:=0;v_pass integer:=0;v_fail integer:=0;v_subject text:='global';v_key text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('assurance-run:'||p_run_key,0));
 select * into r from public.assurance_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;
 if not found then insert into public.assurance_runs(run_key) values(p_run_key) returning * into r;end if;
 for c in select distinct on(control_key) * from public.assurance_controls where enabled order by control_key,version desc loop
  begin
   v:=public.evaluate_assurance_control(c.id);v_checked:=v_checked+1;
   v_key:='run:'||r.id::text||':control:'||c.control_key||':v'||c.version::text;
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values(v_key,r.id,c.id,case when (v->>'passed')::boolean then 'pass' else 'fail' end,v_subject,v,md5(v::text),(v->>'source_observed_at')::timestamptz)
   on conflict(evidence_key) do nothing returning * into e;
   if (v->>'passed')::boolean then
    v_pass:=v_pass+1;
    update public.assurance_findings set status='resolved',resolved_at=now(),updated_at=now() where finding_key=c.control_key||':'||v_subject and status in ('open','acknowledged') returning * into f;
    if found then insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('resolve:'||r.id::text||':'||f.id::text,f.id,r.id,'resolved',jsonb_build_object('evidence_id',e.id)) on conflict(event_key) do nothing;end if;
   else
    v_fail:=v_fail+1;
    insert into public.assurance_findings(finding_key,control_id,subject_key,severity,title,description,last_evidence_id)
    values(c.control_key||':'||v_subject,c.id,v_subject,c.severity,c.name,'A V16 biztosítéki ellenőrzés eltérést talált.',e.id)
    on conflict(finding_key) do update set control_id=excluded.control_id,severity=excluded.severity,last_evidence_id=excluded.last_evidence_id,last_detected_at=now(),occurrence_count=public.assurance_findings.occurrence_count+1,
      status=case when public.assurance_findings.status='resolved' then 'open' when public.assurance_findings.status='accepted_risk' and public.assurance_findings.accepted_risk_expires_at<=now() then 'open' else public.assurance_findings.status end,
      incident_started_at=case when public.assurance_findings.status='resolved' or(public.assurance_findings.status='accepted_risk' and public.assurance_findings.accepted_risk_expires_at<=now()) then now() else public.assurance_findings.incident_started_at end,updated_at=now()
    returning * into f;
    insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('detect:'||r.id::text||':'||f.id::text,f.id,r.id,case when f.occurrence_count>1 then 'redetected' else 'detected' end,jsonb_build_object('evidence_id',e.id,'violations',v->'violations')) on conflict(event_key) do nothing;
   end if;
  exception when others then
   v_checked:=v_checked+1;v_fail:=v_fail+1;
   v:=jsonb_build_object('passed',false,'error',sqlerrm,'source_observed_at',now());
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values('run:'||r.id::text||':control:'||c.control_key||':v'||c.version::text,r.id,c.id,'error',v_subject,v,md5(v::text),now()) on conflict(evidence_key) do nothing;
  end;
 end loop;
 update public.assurance_runs set status='completed',completed_at=now(),controls_checked=v_checked,controls_passed=v_pass,controls_failed=v_fail,metadata=jsonb_build_object('engine_version','v16') where id=r.id returning * into r;
 insert into public.assurance_events(event_key,run_id,event_type,metadata) values('run-complete:'||r.id::text,r.id,'run_completed',jsonb_build_object('checked',v_checked,'passed',v_pass,'failed',v_fail)) on conflict(event_key) do nothing;
 return r;
end;$$;
revoke all on function public.process_assurance_cycle(text) from public,anon,authenticated;
grant execute on function public.process_assurance_cycle(text) to service_role;
