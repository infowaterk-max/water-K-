-- V18 audit hardening: latest-check semantics, non-multiplying read model and guarded creation.
revoke insert on public.post_release_sessions from service_role;revoke insert on public.post_release_evidence from service_role;revoke insert on public.post_release_findings from service_role;

create or replace function public.reconcile_post_release_session(p_session_id uuid,p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;p public.post_release_policies;e record;v_open_high int;v_open_critical int;v_trusted_pass int;v_latest_trusted_fail int;v_target text;v_event text;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status in('closed','cancelled') then return jsonb_build_object('status',s.status,'noop',true);end if;
 select * into p from public.post_release_policies where id=s.policy_id;
 for e in select * from public.post_release_evidence where session_id=s.id and status in('fail','error') loop
   insert into public.post_release_findings(finding_key,session_id,severity,title,description,last_evidence_id)
   values('finding:'||s.id::text||':'||e.check_kind,s.id,case when e.trusted and e.status='error' then 'critical' when e.trusted then 'high' else 'warning' end,'Utóellenőrzési eltérés: '||e.check_kind,'A kiadás utáni ellenőrzés hibát jelzett. Forrás: '||e.source,e.id)
   on conflict(finding_key) do update set occurrence_count=case when public.post_release_findings.last_evidence_id is distinct from excluded.last_evidence_id then public.post_release_findings.occurrence_count+1 else public.post_release_findings.occurrence_count end,last_detected_at=case when public.post_release_findings.last_evidence_id is distinct from excluded.last_evidence_id then now() else public.post_release_findings.last_detected_at end,last_evidence_id=excluded.last_evidence_id,status=case when public.post_release_findings.status='resolved' then 'open' else public.post_release_findings.status end,updated_at=now();
 end loop;
 update public.post_release_findings f set status='resolved',resolved_by=null,updated_at=now() where f.session_id=s.id and f.status in('open','acknowledged') and exists(select 1 from public.post_release_evidence pass join public.post_release_evidence fail on fail.id=f.last_evidence_id where pass.session_id=s.id and pass.check_kind=fail.check_kind and pass.trusted and pass.status='pass' and pass.observed_at>fail.observed_at);
 select count(*) filter(where status in('open','acknowledged') and severity='critical'),count(*) filter(where status in('open','acknowledged') and severity='high') into v_open_critical,v_open_high from public.post_release_findings where session_id=s.id;
 with latest as(select distinct on(check_kind) check_kind,status,trusted from public.post_release_evidence where session_id=s.id order by check_kind,observed_at desc,captured_at desc)
 select count(*) filter(where trusted and status='pass'),count(*) filter(where trusted and status in('fail','error')) into v_trusted_pass,v_latest_trusted_fail from latest;
 if v_open_critical>0 then v_target:='rollback_recommended';elsif v_open_high>0 or v_latest_trusted_fail>0 then v_target:='degraded';elsif now()>=s.observation_ends_at and v_trusted_pass>=p.min_trusted_checks then v_target:='stable';else v_target:='observing';end if;
 if s.status<>v_target then update public.post_release_sessions set status=v_target,stable_at=case when v_target='stable' then now() else stable_at end,updated_at=now() where id=s.id;v_event:=case v_target when 'rollback_recommended' then 'rollback_recommended' when 'degraded' then 'degraded' when 'stable' then 'stable' else null end;if v_event is not null then insert into public.post_release_events(event_key,session_id,event_type,metadata) values('reconcile:'||p_run_key||':'||s.id::text||':'||v_target,s.id,v_event,jsonb_build_object('critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'latest_trusted_fail',v_latest_trusted_fail)) on conflict(event_key) do nothing;end if;end if;
 return jsonb_build_object('status',v_target,'critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'latest_trusted_fail',v_latest_trusted_fail);end;$$;

create or replace view public.post_release_session_queue with(security_invoker=true) as
select s.id as session_id,s.session_key,s.release_candidate_id,s.source_sha,s.status,s.started_at,s.observation_ends_at,s.stable_at,s.closed_at,r.version_label,r.source_ref,r.risk_class,
 coalesce(ev.evidence_count,0)::integer evidence_count,coalesce(ev.trusted_evidence_count,0)::integer trusted_evidence_count,coalesce(ev.trusted_passes,0)::integer trusted_passes,
 coalesce(fi.critical_open,0)::integer critical_open,coalesce(fi.high_open,0)::integer high_open,coalesce(ev.evidence_bundle_hash,md5('')) evidence_bundle_hash
from public.post_release_sessions s join public.release_candidates r on r.id=s.release_candidate_id
left join lateral(select count(*) evidence_count,count(*) filter(where trusted) trusted_evidence_count,count(*) filter(where trusted and status='pass') trusted_passes,md5(coalesce(string_agg(evidence_hash,'|' order by evidence_hash),'')) evidence_bundle_hash from public.post_release_evidence e where e.session_id=s.id)ev on true
left join lateral(select count(*) filter(where status in('open','acknowledged') and severity='critical') critical_open,count(*) filter(where status in('open','acknowledged') and severity='high') high_open from public.post_release_findings f where f.session_id=s.id)fi on true;
revoke all on public.post_release_session_queue from public,anon,authenticated;grant select on public.post_release_session_queue to service_role;
