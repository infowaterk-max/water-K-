-- V16 audit hardening: strict run replay and evidence reconciliation idempotency.
create or replace function public.reconcile_assurance_findings(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$declare e record;f public.assurance_findings;v_opened integer:=0;v_resolved integer:=0;begin
 for e in select ev.*,c.control_key,c.name,c.severity from public.assurance_evidence ev join public.assurance_controls c on c.id=ev.control_id where ev.run_id=p_run_id loop
  select * into f from public.assurance_findings where finding_key=e.control_key||':'||e.subject_key;
  if found and f.last_evidence_id=e.id then continue;end if;
  if e.status='pass' then
   if found and f.status in('open','acknowledged','accepted_risk') then
    update public.assurance_findings set status='resolved',resolved_at=now(),resolved_by=null,last_evidence_id=e.id,accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id returning * into f;
    insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-resolve:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,'resolved',jsonb_build_object('evidence_id',e.id,'automatic',true)) on conflict(event_key) do nothing;v_resolved:=v_resolved+1;
   end if;
  else
   if found then
    update public.assurance_findings set control_id=e.control_id,severity=e.severity,last_evidence_id=e.id,last_detected_at=now(),occurrence_count=occurrence_count+1,
     status=case when status='resolved' then 'open' when status='accepted_risk' and accepted_risk_expires_at<=now() then 'open' else status end,
     incident_started_at=case when status='resolved' or(status='accepted_risk' and accepted_risk_expires_at<=now()) then now() else incident_started_at end,updated_at=now() where id=f.id returning * into f;
   else
    insert into public.assurance_findings(finding_key,control_id,subject_key,severity,title,description,last_evidence_id)
    values(e.control_key||':'||e.subject_key,e.control_id,e.subject_key,e.severity,e.name,case when e.status='error' then 'A biztosítéki ellenőrzés végrehajtási hibába futott.' else 'A biztosítéki ellenőrzés eltérést talált.' end,e.id) returning * into f;
   end if;
   insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-detect:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,case when f.occurrence_count>1 then 'redetected' else 'detected' end,jsonb_build_object('evidence_id',e.id,'evidence_status',e.status)) on conflict(event_key) do nothing;v_opened:=v_opened+1;
  end if;
 end loop;return jsonb_build_object('opened_or_updated',v_opened,'resolved',v_resolved);end;$$;
revoke all on function public.reconcile_assurance_findings(uuid) from public,anon,authenticated;grant execute on function public.reconcile_assurance_findings(uuid) to service_role;

create or replace function public.process_assurance_readiness_cycle(p_run_key text)
returns public.assurance_runs language plpgsql security definer set search_path=''
as $$declare r public.assurance_runs;v_expired integer;v_reconcile jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('assurance-readiness:'||p_run_key,0));
 select * into r from public.assurance_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;
 v_expired:=public.expire_assurance_risk_acceptances(p_run_key);r:=public.process_assurance_cycle(p_run_key);v_reconcile:=public.reconcile_assurance_findings(r.id);
 update public.assurance_runs set metadata=metadata||jsonb_build_object('expired_risk_acceptances',v_expired,'reconciliation',v_reconcile) where id=r.id returning * into r;return r;end;$$;
revoke all on function public.process_assurance_readiness_cycle(text) from public,anon,authenticated;grant execute on function public.process_assurance_readiness_cycle(text) to service_role;
