-- V16: strict finding lifecycle and accepted-risk governance.
create or replace function public.transition_assurance_finding(p_finding_id uuid,p_actor_id uuid,p_target text,p_reason text,p_risk_expires_at timestamptz,p_event_key text)
returns public.assurance_findings language plpgsql security definer set search_path=''
as $$declare f public.assurance_findings;ev public.assurance_events;v_type text;begin
 if p_target not in ('acknowledged','resolved','accepted_risk') then raise exception 'invalid_target';end if;
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('assurance-finding:'||p_finding_id::text,0));
 select * into ev from public.assurance_events where event_key=p_event_key;
 if found then if ev.finding_id<>p_finding_id then raise exception 'event_key_conflict';end if;select * into f from public.assurance_findings where id=p_finding_id;return f;end if;
 select * into f from public.assurance_findings where id=p_finding_id for update;if not found then raise exception 'finding_not_found';end if;
 if p_target='acknowledged' then
  if f.status<>'open' then raise exception 'finding_not_acknowledgeable';end if;
  update public.assurance_findings set status='acknowledged',acknowledged_at=now(),acknowledged_by=p_actor_id,updated_at=now() where id=f.id returning * into f;v_type:='acknowledged';
 elsif p_target='resolved' then
  if f.status not in ('open','acknowledged','accepted_risk') then raise exception 'finding_not_resolvable';end if;
  update public.assurance_findings set status='resolved',resolved_at=now(),resolved_by=p_actor_id,accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id returning * into f;v_type:='resolved';
 else
  if f.status not in ('open','acknowledged') then raise exception 'finding_not_risk_acceptable';end if;
  if nullif(trim(p_reason),'') is null then raise exception 'risk_reason_required';end if;
  if p_risk_expires_at is null or p_risk_expires_at<=now() or p_risk_expires_at>now()+interval '90 days' then raise exception 'risk_expiry_invalid';end if;
  if f.severity='critical' then raise exception 'critical_risk_cannot_be_accepted';end if;
  update public.assurance_findings set status='accepted_risk',accepted_risk_at=now(),accepted_risk_by=p_actor_id,accepted_risk_reason=trim(p_reason),accepted_risk_expires_at=p_risk_expires_at,updated_at=now() where id=f.id returning * into f;v_type:='risk_accepted';
 end if;
 insert into public.assurance_events(event_key,finding_id,event_type,actor_id,metadata) values(p_event_key,f.id,v_type,p_actor_id,jsonb_build_object('reason',p_reason,'risk_expires_at',p_risk_expires_at));
 return f;
end;$$;
revoke all on function public.transition_assurance_finding(uuid,uuid,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.transition_assurance_finding(uuid,uuid,text,text,timestamptz,text) to service_role;

create or replace function public.expire_assurance_risk_acceptances(p_run_key text)
returns integer language plpgsql security definer set search_path=''
as $$declare f record;v_count integer:=0;begin
 for f in select * from public.assurance_findings where status='accepted_risk' and accepted_risk_expires_at<=now() loop
  update public.assurance_findings set status='open',incident_started_at=now(),accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id;
  insert into public.assurance_events(event_key,finding_id,event_type,metadata) values('risk-expired:'||p_run_key||':'||f.id,f.id,'risk_expired',jsonb_build_object('previous_expiry',f.accepted_risk_expires_at)) on conflict(event_key) do nothing;v_count:=v_count+1;
 end loop;return v_count;end;$$;
revoke all on function public.expire_assurance_risk_acceptances(text) from public,anon,authenticated;
grant execute on function public.expire_assurance_risk_acceptances(text) to service_role;
