-- V19 audit hardening: append-only evidence/events and replay-safe finding lifecycle.
create or replace function public.block_recovery_append_only_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Append-only recovery record cannot be modified.';end;$$;
drop trigger if exists trg_recovery_evidence_append_only on public.recovery_evidence;create trigger trg_recovery_evidence_append_only before update or delete on public.recovery_evidence for each row execute function public.block_recovery_append_only_mutation();
drop trigger if exists trg_recovery_events_append_only on public.recovery_events;create trigger trg_recovery_events_append_only before update or delete on public.recovery_events for each row execute function public.block_recovery_append_only_mutation();
revoke update,delete on public.recovery_evidence from service_role;revoke update,delete on public.recovery_events from service_role;
revoke update,delete on public.recovery_findings from service_role;revoke update,delete on public.recovery_drills from service_role;

create or replace function public.upsert_recovery_finding(p_objective_id uuid,p_finding_type text,p_severity text,p_title text,p_description text,p_run_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.recovery_objectives;v_key text;v public.recovery_findings;v_id uuid;v_event text;begin
 select * into o from public.recovery_objectives where id=p_objective_id;if not found then raise exception 'Recovery objective nem található.';end if;
 v_key:='recovery:'||o.service_key||':'||p_finding_type;
 select * into v from public.recovery_findings where finding_key=v_key for update;
 if not found then
   insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,p_objective_id,p_finding_type,p_severity,p_title,p_description) returning id into v_id;v_event:='finding_opened';
 elsif v.status='resolved' then
   update public.recovery_findings set status='open',severity=p_severity,title=p_title,description=p_description,occurrence_count=occurrence_count+1,last_detected_at=now(),resolved_by=null,updated_at=now() where id=v.id;v_id:=v.id;v_event:='finding_reopened';
 else
   update public.recovery_findings set severity=p_severity,title=p_title,description=p_description,last_detected_at=now(),updated_at=now() where id=v.id;v_id:=v.id;v_event:=null;
 end if;
 if v_event is not null then insert into public.recovery_events(event_key,objective_id,finding_id,event_type,metadata) values(p_run_key||':'||v_key||':'||v_event,p_objective_id,v_id,v_event,jsonb_build_object('run_key',p_run_key)) on conflict(event_key) do nothing;end if;
 return v_id;
end;$$;
revoke all on function public.upsert_recovery_finding(uuid,text,text,text,text,text) from public,anon,authenticated;grant execute on function public.upsert_recovery_finding(uuid,text,text,text,text,text) to service_role;

create or replace function public.resolve_recovery_finding(p_objective_id uuid,p_finding_type text,p_run_key text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v public.recovery_findings;begin
 select * into v from public.recovery_findings where objective_id=p_objective_id and finding_type=p_finding_type for update;
 if not found or v.status='resolved' then return false;end if;
 update public.recovery_findings set status='resolved',resolved_by=null,updated_at=now() where id=v.id;
 insert into public.recovery_events(event_key,objective_id,finding_id,event_type,metadata) values(p_run_key||':resolve:'||v.finding_key,p_objective_id,v.id,'finding_resolved',jsonb_build_object('run_key',p_run_key)) on conflict(event_key) do nothing;
 return true;
end;$$;
revoke all on function public.resolve_recovery_finding(uuid,text,text) from public,anon,authenticated;grant execute on function public.resolve_recovery_finding(uuid,text,text) to service_role;
