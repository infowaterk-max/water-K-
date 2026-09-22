-- V19: guarded evidence and recovery drill lifecycle.
create or replace function public.record_recovery_evidence(
 p_service_key text,p_evidence_kind text,p_status text,p_trusted boolean,p_source text,p_observed_at timestamptz,p_evidence jsonb,p_event_key text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_objective public.recovery_objectives;v_id uuid;v_hash text;begin
 select * into v_objective from public.recovery_objectives where service_key=p_service_key and enabled order by version desc limit 1;
 if not found then raise exception 'Nincs aktív recovery objective ehhez a szolgáltatáshoz.';end if;
 if p_trusted and not coalesce((v_objective.definition->'trusted_sources') ? p_source,false) then raise exception 'A megadott forrás ehhez az objective-hez nem trusted.';end if;
 v_hash:=md5(v_objective.id::text||'|'||p_evidence_kind||'|'||p_status||'|'||p_source||'|'||p_observed_at::text||'|'||coalesce(p_evidence,'{}'::jsonb)::text);
 select id into v_id from public.recovery_evidence where evidence_key=p_event_key;
 if found then return v_id;end if;
 insert into public.recovery_evidence(evidence_key,objective_id,evidence_kind,status,trusted,source,observed_at,evidence,evidence_hash)
 values(p_event_key,v_objective.id,p_evidence_kind,p_status,p_trusted,p_source,p_observed_at,coalesce(p_evidence,'{}'::jsonb),v_hash) returning id into v_id;
 insert into public.recovery_events(event_key,objective_id,event_type,metadata) values('event:'||p_event_key,v_objective.id,'evidence_recorded',jsonb_build_object('evidence_id',v_id,'kind',p_evidence_kind,'status',p_status,'trusted',p_trusted)) on conflict(event_key) do nothing;
 return v_id;
end;$$;
revoke all on function public.record_recovery_evidence(text,text,text,boolean,text,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_recovery_evidence(text,text,text,boolean,text,timestamptz,jsonb,text) to service_role;

create or replace function public.plan_recovery_drill(p_service_key text,p_scenario text,p_planned_at timestamptz,p_actor_id uuid,p_drill_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_objective public.recovery_objectives;v_id uuid;begin
 select * into v_objective from public.recovery_objectives where service_key=p_service_key and enabled order by version desc limit 1;
 if not found then raise exception 'Nincs aktív recovery objective.';end if;
 select id into v_id from public.recovery_drills where drill_key=p_drill_key;if found then return v_id;end if;
 insert into public.recovery_drills(drill_key,objective_id,scenario,planned_at,created_by) values(p_drill_key,v_objective.id,p_scenario,p_planned_at,p_actor_id) returning id into v_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id,metadata) values('planned:'||p_drill_key,v_objective.id,v_id,'drill_planned',p_actor_id,jsonb_build_object('scenario',p_scenario)) on conflict(event_key) do nothing;
 return v_id;
end;$$;
revoke all on function public.plan_recovery_drill(text,text,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.plan_recovery_drill(text,text,timestamptz,uuid,text) to service_role;

create or replace function public.start_recovery_drill(p_drill_id uuid,p_actor_id uuid,p_event_key text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.recovery_drills;begin
 select * into v from public.recovery_drills where id=p_drill_id for update;if not found then raise exception 'Drill nem található.';end if;
 if v.status='running' then return;end if;if v.status<>'planned' then raise exception 'Csak tervezett drill indítható.';end if;
 update public.recovery_drills set status='running',started_at=now(),updated_at=now() where id=p_drill_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id) values(p_event_key,v.objective_id,p_drill_id,'drill_started',p_actor_id) on conflict(event_key) do nothing;
end;$$;
revoke all on function public.start_recovery_drill(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.start_recovery_drill(uuid,uuid,text) to service_role;

create or replace function public.complete_recovery_drill(p_drill_id uuid,p_actor_id uuid,p_measured_rto integer,p_measured_rpo integer,p_restore_validated boolean,p_result jsonb,p_event_key text)
returns text language plpgsql security definer set search_path='' as $$
declare v public.recovery_drills;o public.recovery_objectives;v_status text;begin
 select * into v from public.recovery_drills where id=p_drill_id for update;if not found then raise exception 'Drill nem található.';end if;
 if v.status in('passed','failed') then return v.status;end if;if v.status<>'running' then raise exception 'Csak futó drill zárható.';end if;
 select * into o from public.recovery_objectives where id=v.objective_id;
 v_status:=case when p_restore_validated and p_measured_rto<=o.rto_minutes and p_measured_rpo<=o.rpo_minutes then 'passed' else 'failed' end;
 update public.recovery_drills set status=v_status,completed_at=now(),measured_rto_minutes=p_measured_rto,measured_rpo_minutes=p_measured_rpo,restore_validated=p_restore_validated,result=coalesce(p_result,'{}'::jsonb),updated_at=now() where id=p_drill_id;
 insert into public.recovery_events(event_key,objective_id,drill_id,event_type,actor_id,metadata) values(p_event_key,v.objective_id,p_drill_id,case when v_status='passed' then 'drill_passed' else 'drill_failed' end,p_actor_id,jsonb_build_object('measured_rto',p_measured_rto,'measured_rpo',p_measured_rpo,'restore_validated',p_restore_validated)) on conflict(event_key) do nothing;
 return v_status;
end;$$;
revoke all on function public.complete_recovery_drill(uuid,uuid,integer,integer,boolean,jsonb,text) from public,anon,authenticated;grant execute on function public.complete_recovery_drill(uuid,uuid,integer,integer,boolean,jsonb,text) to service_role;
