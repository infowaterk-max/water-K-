-- V16 audit hardening: error findings, accepted-risk resolution and strict readiness gates.
drop view if exists public.assurance_readiness;
create or replace view public.assurance_readiness with(security_invoker=true) as
with latest as(select * from public.assurance_latest_control_results),score as(
 select coalesce(sum(weight),0) total_weight,coalesce(sum(weight) filter(where status='pass' and not stale),0) passed_weight,
 count(*)::integer controls,count(*) filter(where status='pass' and not stale)::integer fresh_passes,count(*) filter(where stale)::integer stale_controls,
 count(*) filter(where status in('fail','error'))::integer failing_controls from latest),
 findings as(select count(*) filter(where status in('open','acknowledged') and severity='critical')::integer critical_open,count(*) filter(where status in('open','acknowledged') and severity='high')::integer high_open,count(*) filter(where status='accepted_risk')::integer accepted_risks from public.assurance_findings)
select case when score.total_weight=0 then 0 else round(100.0*score.passed_weight/score.total_weight) end::integer as assurance_score,
 score.controls,score.fresh_passes,score.stale_controls,score.failing_controls,findings.critical_open,findings.high_open,findings.accepted_risks,
 case when findings.critical_open>0 or exists(select 1 from latest where status in('fail','error') and severity='critical') then 'blocked'
      when score.stale_controls>0 or score.failing_controls>0 or findings.high_open>0 then 'degraded'
      when score.total_weight=0 then 'unknown' else 'ready' end as readiness_status
from score cross join findings;
revoke all on public.assurance_readiness from public,anon,authenticated;grant select on public.assurance_readiness to service_role;

create or replace function public.reconcile_assurance_findings(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$declare e record;f public.assurance_findings;v_opened integer:=0;v_resolved integer:=0;begin
 for e in select ev.*,c.control_key,c.name,c.severity from public.assurance_evidence ev join public.assurance_controls c on c.id=ev.control_id where ev.run_id=p_run_id loop
  if e.status='pass' then
   update public.assurance_findings set status='resolved',resolved_at=now(),resolved_by=null,accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now()
   where finding_key=e.control_key||':'||e.subject_key and status in('open','acknowledged','accepted_risk') returning * into f;
   if found then insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-resolve:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,'resolved',jsonb_build_object('evidence_id',e.id,'automatic',true)) on conflict(event_key) do nothing;v_resolved:=v_resolved+1;end if;
  else
   insert into public.assurance_findings(finding_key,control_id,subject_key,severity,title,description,last_evidence_id)
   values(e.control_key||':'||e.subject_key,e.control_id,e.subject_key,e.severity,e.name,case when e.status='error' then 'A biztosítéki ellenőrzés végrehajtási hibába futott.' else 'A biztosítéki ellenőrzés eltérést talált.' end,e.id)
   on conflict(finding_key) do update set control_id=excluded.control_id,severity=excluded.severity,last_evidence_id=excluded.last_evidence_id,last_detected_at=now(),occurrence_count=public.assurance_findings.occurrence_count+1,
    status=case when public.assurance_findings.status='resolved' then 'open' when public.assurance_findings.status='accepted_risk' and public.assurance_findings.accepted_risk_expires_at<=now() then 'open' else public.assurance_findings.status end,
    incident_started_at=case when public.assurance_findings.status='resolved' or(public.assurance_findings.status='accepted_risk' and public.assurance_findings.accepted_risk_expires_at<=now()) then now() else public.assurance_findings.incident_started_at end,updated_at=now() returning * into f;
   insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-detect:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,case when f.occurrence_count>1 then 'redetected' else 'detected' end,jsonb_build_object('evidence_id',e.id,'evidence_status',e.status)) on conflict(event_key) do nothing;v_opened:=v_opened+1;
  end if;
 end loop;return jsonb_build_object('opened_or_updated',v_opened,'resolved',v_resolved);end;$$;
revoke all on function public.reconcile_assurance_findings(uuid) from public,anon,authenticated;grant execute on function public.reconcile_assurance_findings(uuid) to service_role;

create or replace function public.process_assurance_readiness_cycle(p_run_key text)
returns public.assurance_runs language plpgsql security definer set search_path=''
as $$declare r public.assurance_runs;v_expired integer;v_reconcile jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 v_expired:=public.expire_assurance_risk_acceptances(p_run_key);r:=public.process_assurance_cycle(p_run_key);v_reconcile:=public.reconcile_assurance_findings(r.id);
 update public.assurance_runs set metadata=metadata||jsonb_build_object('expired_risk_acceptances',v_expired,'reconciliation',v_reconcile) where id=r.id returning * into r;return r;end;$$;
revoke all on function public.process_assurance_readiness_cycle(text) from public,anon,authenticated;grant execute on function public.process_assurance_readiness_cycle(text) to service_role;

create or replace function public.guard_assurance_finding_identity() returns trigger language plpgsql set search_path='' as $$begin if new.finding_key is distinct from old.finding_key or new.control_id is distinct from old.control_id or new.subject_key is distinct from old.subject_key or new.first_detected_at is distinct from old.first_detected_at then raise exception 'assurance_finding_identity_immutable';end if;return new;end;$$;
drop trigger if exists guard_assurance_finding_identity_trigger on public.assurance_findings;create trigger guard_assurance_finding_identity_trigger before update on public.assurance_findings for each row execute function public.guard_assurance_finding_identity();

revoke insert,update,delete on public.assurance_controls from service_role;grant select on public.assurance_controls to service_role;
revoke insert,update,delete on public.assurance_findings from service_role;grant select on public.assurance_findings to service_role;
