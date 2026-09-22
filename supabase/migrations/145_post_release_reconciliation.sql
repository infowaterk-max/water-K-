-- V18: reconcile evidence into findings and session health.
create or replace function public.reconcile_post_release_session(p_session_id uuid,p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;p public.post_release_policies;e record;f public.post_release_findings;v_open_high int;v_open_critical int;v_trusted_pass int;v_trusted_fail int;v_target text;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status in('closed','cancelled') then return jsonb_build_object('status',s.status,'noop',true);end if;
 select * into p from public.post_release_policies where id=s.policy_id;
 for e in select * from public.post_release_evidence where session_id=s.id and status in('fail','error') loop
   insert into public.post_release_findings(finding_key,session_id,severity,title,description,last_evidence_id)
   values('finding:'||s.id::text||':'||e.check_kind,s.id,case when e.trusted and e.status='error' then 'critical' when e.trusted then 'high' else 'warning' end,
   'Utóellenőrzési eltérés: '||e.check_kind,'A kiadás utáni ellenőrzés hibát jelzett. Forrás: '||e.source,e.id)
   on conflict(finding_key) do update set occurrence_count=public.post_release_findings.occurrence_count+1,last_detected_at=now(),last_evidence_id=excluded.last_evidence_id,status=case when public.post_release_findings.status='resolved' then 'open' else public.post_release_findings.status end,updated_at=now();
 end loop;
 -- Resolve a finding only when a newer trusted pass exists for the same check kind than its last failing evidence.
 update public.post_release_findings f set status='resolved',resolved_by=null,updated_at=now()
 where f.session_id=s.id and f.status in('open','acknowledged') and exists(
   select 1 from public.post_release_evidence pass join public.post_release_evidence fail on fail.id=f.last_evidence_id
   where pass.session_id=s.id and pass.check_kind=fail.check_kind and pass.trusted and pass.status='pass' and pass.observed_at>fail.observed_at);
 select count(*) filter(where status in('open','acknowledged') and severity='critical'),count(*) filter(where status in('open','acknowledged') and severity='high') into v_open_critical,v_open_high from public.post_release_findings where session_id=s.id;
 select count(*) filter(where trusted and status='pass'),count(*) filter(where trusted and status in('fail','error')) into v_trusted_pass,v_trusted_fail from public.post_release_evidence where session_id=s.id;
 if v_open_critical>0 then v_target:='rollback_recommended';
 elsif v_open_high>0 or v_trusted_fail>0 then v_target:='degraded';
 elsif now()>=s.observation_ends_at and v_trusted_pass>=p.min_trusted_checks then v_target:='stable';
 else v_target:='observing';end if;
 if s.status<>v_target then
   update public.post_release_sessions set status=v_target,stable_at=case when v_target='stable' then now() else stable_at end,updated_at=now() where id=s.id;
   insert into public.post_release_events(event_key,session_id,event_type,metadata) values('reconcile:'||p_run_key||':'||s.id::text,s.id,case when v_target='rollback_recommended' then 'rollback_recommended' when v_target='degraded' then 'degraded' when v_target='stable' then 'stable' else 'degraded' end,jsonb_build_object('critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail)) on conflict(event_key) do nothing;
 end if;
 return jsonb_build_object('status',v_target,'critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail);end;$$;
revoke all on function public.reconcile_post_release_session(uuid,text) from public,anon,authenticated;grant execute on function public.reconcile_post_release_session(uuid,text) to service_role;

create or replace function public.decide_post_release_session(p_session_id uuid,p_actor_id uuid,p_decision text,p_note text,p_event_key text)
returns public.post_release_sessions language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if p_decision='close' then
   if s.status<>'stable' then raise exception 'Csak stabil utóellenőrzés zárható le.';end if;
   update public.post_release_sessions set status='closed',closed_at=now(),updated_at=now() where id=s.id returning * into s;
   insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'closed',p_actor_id,jsonb_build_object('note',p_note));
 elsif p_decision='cancel' then
   if s.status in('closed','cancelled') then return s;end if;
   update public.post_release_sessions set status='cancelled',closed_at=now(),updated_at=now() where id=s.id returning * into s;
   insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'cancelled',p_actor_id,jsonb_build_object('note',p_note));
 else raise exception 'Érvénytelen döntés.';end if;
 return s;end;$$;
revoke all on function public.decide_post_release_session(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.decide_post_release_session(uuid,uuid,text,text,text) to service_role;
