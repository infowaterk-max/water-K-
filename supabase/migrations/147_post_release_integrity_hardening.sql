-- V18 audit hardening: immutable evidence/events, guarded mutations, replay-safe reconciliation.
create or replace function public.block_post_release_immutable_mutation() returns trigger language plpgsql as $$begin raise exception 'Append-only V18 rekord nem módosítható.';end;$$;
drop trigger if exists post_release_evidence_immutable on public.post_release_evidence;create trigger post_release_evidence_immutable before update or delete on public.post_release_evidence for each row execute function public.block_post_release_immutable_mutation();
drop trigger if exists post_release_events_immutable on public.post_release_events;create trigger post_release_events_immutable before update or delete on public.post_release_events for each row execute function public.block_post_release_immutable_mutation();

revoke update,delete on public.post_release_evidence from service_role;revoke update,delete on public.post_release_events from service_role;revoke update,delete on public.post_release_policies from service_role;revoke update,delete on public.post_release_findings from service_role;revoke update,delete on public.post_release_sessions from service_role;

create unique index if not exists post_release_reconcile_event_unique on public.post_release_events(event_key);

create or replace function public.set_post_release_finding_state(p_finding_id uuid,p_actor_id uuid,p_action text,p_event_key text)
returns public.post_release_findings language plpgsql security definer set search_path='' as $$
declare f public.post_release_findings;begin
 select * into f from public.post_release_findings where id=p_finding_id for update;if not found then raise exception 'Ismeretlen finding.';end if;
 if p_action='acknowledge' then
   if f.status='resolved' then raise exception 'Megoldott finding nem vehető át.';end if;
   update public.post_release_findings set status='acknowledged',acknowledged_by=p_actor_id,updated_at=now() where id=f.id returning * into f;
 elsif p_action='resolve' then
   update public.post_release_findings set status='resolved',resolved_by=p_actor_id,updated_at=now() where id=f.id returning * into f;
 else raise exception 'Érvénytelen finding művelet.';end if;
 insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,f.session_id,case when p_action='resolve' then 'finding_resolved' else 'finding_opened' end,p_actor_id,jsonb_build_object('finding_id',f.id,'action',p_action)) on conflict(event_key) do nothing;
 return f;end;$$;
revoke all on function public.set_post_release_finding_state(uuid,uuid,text,text) from public,anon,authenticated;grant execute on function public.set_post_release_finding_state(uuid,uuid,text,text) to service_role;

-- Fix reconciliation event semantics: only emit lifecycle events for actual degraded/rollback/stable transitions.
create or replace function public.reconcile_post_release_session(p_session_id uuid,p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;p public.post_release_policies;e record;v_open_high int;v_open_critical int;v_trusted_pass int;v_trusted_fail int;v_target text;v_event text;begin
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
 select count(*) filter(where trusted and status='pass'),count(*) filter(where trusted and status in('fail','error')) into v_trusted_pass,v_trusted_fail from public.post_release_evidence where session_id=s.id;
 if v_open_critical>0 then v_target:='rollback_recommended';elsif v_open_high>0 or v_trusted_fail>0 then v_target:='degraded';elsif now()>=s.observation_ends_at and v_trusted_pass>=p.min_trusted_checks then v_target:='stable';else v_target:='observing';end if;
 if s.status<>v_target then
   update public.post_release_sessions set status=v_target,stable_at=case when v_target='stable' then now() else stable_at end,updated_at=now() where id=s.id;
   v_event:=case v_target when 'rollback_recommended' then 'rollback_recommended' when 'degraded' then 'degraded' when 'stable' then 'stable' else null end;
   if v_event is not null then insert into public.post_release_events(event_key,session_id,event_type,metadata) values('reconcile:'||p_run_key||':'||s.id::text||':'||v_target,s.id,v_event,jsonb_build_object('critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail)) on conflict(event_key) do nothing;end if;
 end if;
 return jsonb_build_object('status',v_target,'critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail);end;$$;
