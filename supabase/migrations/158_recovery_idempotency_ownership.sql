-- V19 audit hardening: idempotency keys must belong to the exact same operation.
create or replace function public.record_recovery_evidence(
 p_service_key text,p_evidence_kind text,p_status text,p_trusted boolean,p_source text,p_observed_at timestamptz,p_evidence jsonb,p_event_key text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_objective public.recovery_objectives;v public.recovery_evidence;v_id uuid;v_hash text;begin
 select * into v_objective from public.recovery_objectives where service_key=p_service_key and enabled order by version desc limit 1;if not found then raise exception 'Nincs aktív recovery objective.';end if;
 if p_trusted and not coalesce((v_objective.definition->'trusted_sources') ? p_source,false) then raise exception 'A megadott forrás nem trusted.';end if;
 v_hash:=md5(v_objective.id::text||'|'||p_evidence_kind||'|'||p_status||'|'||p_source||'|'||p_observed_at::text||'|'||coalesce(p_evidence,'{}'::jsonb)::text);
 select * into v from public.recovery_evidence where evidence_key=p_event_key;
 if found then if v.objective_id<>v_objective.id or v.evidence_kind<>p_evidence_kind or v.status<>p_status or v.trusted<>p_trusted or v.source<>p_source or v.observed_at<>p_observed_at or v.evidence_hash<>v_hash then raise exception 'Az evidence_key már más recovery evidence-hez tartozik.';end if;return v.id;end if;
 insert into public.recovery_evidence(evidence_key,objective_id,evidence_kind,status,trusted,source,observed_at,evidence,evidence_hash) values(p_event_key,v_objective.id,p_evidence_kind,p_status,p_trusted,p_source,p_observed_at,coalesce(p_evidence,'{}'::jsonb),v_hash) returning id into v_id;
 insert into public.recovery_events(event_key,objective_id,event_type,metadata) values('event:'||p_event_key,v_objective.id,'evidence_recorded',jsonb_build_object('evidence_id',v_id,'kind',p_evidence_kind,'status',p_status,'trusted',p_trusted)) on conflict(event_key) do nothing;return v_id;
end;$$;

create or replace function public.start_recovery_drill(p_drill_id uuid,p_actor_id uuid,p_event_key text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.recovery_drills;e public.recovery_events;begin
 select * into e from public.recovery_events where event_key=p_event_key;if found then if e.drill_id is distinct from p_drill_id or e.event_type<>'drill_started' then raise exception 'Az event_key már más recovery művelethez tartozik.';end if;return;end if;
 select * into v from public.recovery_drills where id=p_drill_id for update;if not found then raise exception 'Drill nem található.';end if;if v.status='running' then raise exception 'A drill már fut, de más idempotency kulccsal indult.';end if;if v.status<>'planned' then raise exception 'Csak tervezett drill indítható.';end if;
 update public.recovery_drills set status='running',started_at=now(),updated_at=now() where id=p_drill_id;insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id) values(p_event_key,v.objective_id,p_drill_id,'drill_started',p_actor_id);
end;$$;

create or replace function public.complete_recovery_drill(p_drill_id uuid,p_actor_id uuid,p_measured_rto integer,p_measured_rpo integer,p_restore_validated boolean,p_result jsonb,p_event_key text)
returns text language plpgsql security definer set search_path='' as $$
declare v public.recovery_drills;o public.recovery_objectives;e public.recovery_events;v_status text;begin
 select * into e from public.recovery_events where event_key=p_event_key;if found then if e.drill_id is distinct from p_drill_id or e.event_type not in('drill_passed','drill_failed') then raise exception 'Az event_key már más recovery művelethez tartozik.';end if;select status into v_status from public.recovery_drills where id=p_drill_id;return v_status;end if;
 select * into v from public.recovery_drills where id=p_drill_id for update;if not found then raise exception 'Drill nem található.';end if;if v.status in('passed','failed') then raise exception 'A drill már lezárt, más idempotency kulccsal.';end if;if v.status<>'running' then raise exception 'Csak futó drill zárható.';end if;
 select * into o from public.recovery_objectives where id=v.objective_id;v_status:=case when p_restore_validated and p_measured_rto<=o.rto_minutes and p_measured_rpo<=o.rpo_minutes then 'passed' else 'failed' end;
 update public.recovery_drills set status=v_status,completed_at=now(),measured_rto_minutes=p_measured_rto,measured_rpo_minutes=p_measured_rpo,restore_validated=p_restore_validated,result=coalesce(p_result,'{}'::jsonb),updated_at=now() where id=p_drill_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id,metadata) values(p_event_key,v.objective_id,p_drill_id,case when v_status='passed' then 'drill_passed' else 'drill_failed' end,p_actor_id,jsonb_build_object('measured_rto',p_measured_rto,'measured_rpo',p_measured_rpo,'restore_validated',p_restore_validated));return v_status;
end;$$;

create or replace function public.record_recovery_decision(p_finding_id uuid,p_actor_id uuid,p_decision text,p_note text,p_decision_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.recovery_findings;d public.recovery_decisions;v_id uuid;begin
 if length(trim(p_note))<10 then raise exception 'Legalább 10 karakteres indoklás szükséges.';end if;select * into v from public.recovery_findings where id=p_finding_id;if not found then raise exception 'Finding nem található.';end if;
 select * into d from public.recovery_decisions where decision_key=p_decision_key;if found then if d.finding_id is distinct from p_finding_id or d.actor_id<>p_actor_id or d.decision<>p_decision or d.note<>p_note then raise exception 'A decision_key már más recovery döntéshez tartozik.';end if;return d.id;end if;
 insert into public.recovery_decisions(decision_key,objective_id,finding_id,decision,note,actor_id) values(p_decision_key,v.objective_id,p_finding_id,p_decision,p_note,p_actor_id) returning id into v_id;insert into public.recovery_events(event_key,objective_id,finding_id,event_type,actor_id,metadata) values('event:'||p_decision_key,v.objective_id,p_finding_id,'decision_recorded',p_actor_id,jsonb_build_object('decision',p_decision,'note',p_note));return v_id;
end;$$;
