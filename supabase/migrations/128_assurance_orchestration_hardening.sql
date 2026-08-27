-- V16: immutable evidence/events, versioned control definitions and orchestration.
create or replace function public.guard_assurance_control_version() returns trigger language plpgsql set search_path='' as $$begin
 if new.control_key is distinct from old.control_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.severity is distinct from old.severity or new.weight is distinct from old.weight or new.freshness_minutes is distinct from old.freshness_minutes or new.check_kind is distinct from old.check_kind or new.definition is distinct from old.definition then raise exception 'assurance_control_version_immutable';end if;new.updated_at:=now();return new;end;$$;
drop trigger if exists guard_assurance_control_version_trigger on public.assurance_controls;create trigger guard_assurance_control_version_trigger before update on public.assurance_controls for each row execute function public.guard_assurance_control_version();

create or replace function public.guard_assurance_append_only() returns trigger language plpgsql set search_path='' as $$begin raise exception 'assurance_ledger_append_only';end;$$;
drop trigger if exists guard_assurance_evidence_append_only on public.assurance_evidence;create trigger guard_assurance_evidence_append_only before update or delete on public.assurance_evidence for each row execute function public.guard_assurance_append_only();
drop trigger if exists guard_assurance_events_append_only on public.assurance_events;create trigger guard_assurance_events_append_only before update or delete on public.assurance_events for each row execute function public.guard_assurance_append_only();
revoke update,delete on public.assurance_evidence from service_role;revoke update,delete on public.assurance_events from service_role;

create or replace function public.process_assurance_readiness_cycle(p_run_key text)
returns public.assurance_runs language plpgsql security definer set search_path=''
as $$declare r public.assurance_runs;v_expired integer;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 v_expired:=public.expire_assurance_risk_acceptances(p_run_key);
 r:=public.process_assurance_cycle(p_run_key);
 update public.assurance_runs set metadata=metadata||jsonb_build_object('expired_risk_acceptances',v_expired) where id=r.id returning * into r;
 return r;
end;$$;
revoke all on function public.process_assurance_readiness_cycle(text) from public,anon,authenticated;grant execute on function public.process_assurance_readiness_cycle(text) to service_role;

-- Data API compatibility: explicit service-role grants for V16 source reads.
grant select on public.control_alerts,public.control_tasks,public.action_proposals,public.action_policies,public.action_approvals,public.automation_control,public.automation_runbook_instances,public.automation_step_runs to service_role;
