-- V17: candidate creation, CI evidence update and deterministic gate evaluation.
create or replace function public.create_release_candidate(p_candidate_key text,p_version_label text,p_source_ref text,p_source_sha text,p_risk_class text,p_change_summary text,p_rollback_plan text,p_created_by uuid,p_event_key text)
returns public.release_candidates language plpgsql security definer set search_path=''
as $$declare c public.release_candidates;pol public.release_policies;ev public.release_events;begin
 if nullif(trim(p_candidate_key),'') is null or nullif(trim(p_source_sha),'') is null then raise exception 'candidate_identity_required';end if;
 select * into ev from public.release_events where event_key=p_event_key;if found then select * into c from public.release_candidates where id=ev.candidate_id;return c;end if;
 select distinct on(policy_key) * into pol from public.release_policies where enabled and risk_class=p_risk_class order by policy_key,version desc limit 1;if not found then raise exception 'release_policy_not_found';end if;
 insert into public.release_candidates(candidate_key,version_label,source_ref,source_sha,risk_class,change_summary,rollback_plan,policy_id,created_by,expires_at)
 values(p_candidate_key,p_version_label,p_source_ref,p_source_sha,p_risk_class,p_change_summary,p_rollback_plan,pol.id,p_created_by,now()+make_interval(mins=>pol.evaluation_valid_minutes)) returning * into c;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'created',p_created_by,jsonb_build_object('source_ref',p_source_ref,'source_sha',p_source_sha,'policy_id',pol.id));return c;
end;$$;
revoke all on function public.create_release_candidate(text,text,text,text,text,text,text,uuid,text) from public,anon,authenticated;grant execute on function public.create_release_candidate(text,text,text,text,text,text,text,uuid,text) to service_role;

create or replace function public.update_release_ci_evidence(p_candidate_id uuid,p_actor_id uuid,p_ci_status text,p_observed_at timestamptz,p_evidence jsonb,p_event_key text)
returns public.release_candidates language plpgsql security definer set search_path=''
as $$declare c public.release_candidates;ev public.release_events;begin
 if p_ci_status not in('success','failure','cancelled','pending') then raise exception 'invalid_ci_status';end if;perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));
 select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;
 select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;
 update public.release_candidates set ci_status=p_ci_status,ci_observed_at=p_observed_at,ci_evidence=coalesce(p_evidence,'{}'::jsonb),status='draft',gate_snapshot=null,gate_hash=null,evaluated_at=null,updated_at=now() where id=c.id returning * into c;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'ci_updated',p_actor_id,jsonb_build_object('ci_status',p_ci_status,'observed_at',p_observed_at));return c;end;$$;
revoke all on function public.update_release_ci_evidence(uuid,uuid,text,timestamptz,jsonb,text) from public,anon,authenticated;grant execute on function public.update_release_ci_evidence(uuid,uuid,text,timestamptz,jsonb,text) to service_role;

create or replace function public.evaluate_release_candidate(p_candidate_id uuid,p_actor_id uuid,p_event_key text)
returns public.release_candidates language plpgsql security definer set search_path=''
as $$declare c public.release_candidates;pol public.release_policies;r public.assurance_readiness;ar record;ev public.release_events;v_ci_ok boolean;v_rb_ok boolean;v_assurance_ok boolean;v_snapshot jsonb;v_hash text;begin
 perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;
 select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;
 select * into pol from public.release_policies where id=c.policy_id;if not pol.enabled then raise exception 'release_policy_disabled';end if;select * into r from public.assurance_readiness;
 select * into ar from public.assurance_recent_runs where status='completed' order by completed_at desc nulls last limit 1;
 v_ci_ok:=not pol.require_ci_green or(c.ci_status='success' and c.ci_observed_at is not null and c.ci_observed_at>=now()-make_interval(mins=>pol.ci_freshness_minutes));
 v_rb_ok:=not pol.require_rollback_plan or nullif(trim(c.rollback_plan),'') is not null;
 v_assurance_ok:=r.assurance_score>=pol.min_assurance_score and r.stale_controls<=pol.max_stale_controls and r.critical_open=0 and r.high_open<=pol.max_high_findings and r.accepted_risks<=pol.max_accepted_risks and r.readiness_status='ready' and ar.id is not null;
 v_snapshot:=jsonb_build_object('policy_id',pol.id,'policy_version',pol.version,'assurance_score',r.assurance_score,'readiness_status',r.readiness_status,'stale_controls',r.stale_controls,'critical_open',r.critical_open,'high_open',r.high_open,'accepted_risks',r.accepted_risks,'assurance_run_id',ar.id,'assurance_bundle_hash',ar.evidence_bundle_hash,'ci_status',c.ci_status,'ci_observed_at',c.ci_observed_at,'ci_ok',v_ci_ok,'rollback_plan_ok',v_rb_ok,'assurance_ok',v_assurance_ok,'evaluated_at',now());v_hash:=md5(v_snapshot::text);
 insert into public.release_gate_results(gate_key,candidate_id,gate_name,status,evidence,evidence_hash) values('candidate:'||c.id||':evaluation:'||v_hash,c.id,'release_readiness',case when v_ci_ok and v_rb_ok and v_assurance_ok then 'pass' else 'fail' end,v_snapshot,v_hash);
 update public.release_candidates set status=case when v_ci_ok and v_rb_ok and v_assurance_ok then 'ready' else 'evaluated' end,assurance_run_id=ar.id,assurance_bundle_hash=ar.evidence_bundle_hash,assurance_score=r.assurance_score,gate_snapshot=v_snapshot,gate_hash=v_hash,evaluated_at=now(),expires_at=now()+make_interval(mins=>pol.evaluation_valid_minutes),updated_at=now() where id=c.id returning * into c;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'evaluated',p_actor_id,jsonb_build_object('gate_hash',v_hash,'status',c.status));return c;end;$$;
revoke all on function public.evaluate_release_candidate(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.evaluate_release_candidate(uuid,uuid,text) to service_role;
