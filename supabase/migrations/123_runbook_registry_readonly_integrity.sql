-- V15 final registry hardening: runtime is read-only; new definitions require a new migration/version.
create or replace function public.guard_automation_runbook_identity()
returns trigger language plpgsql set search_path=''
as $$begin
 if new.runbook_key is distinct from old.runbook_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.min_severity is distinct from old.min_severity or new.risk_class is distinct from old.risk_class or new.requires_action_approval is distinct from old.requires_action_approval or new.max_duration_hours is distinct from old.max_duration_hours or new.max_failures is distinct from old.max_failures or new.definition is distinct from old.definition then raise exception 'runbook_version_definition_immutable_create_new_version';end if;new.updated_at:=now();return new;end;$$;
revoke insert,update,delete on public.automation_runbooks from service_role;grant select on public.automation_runbooks to service_role;
revoke insert,update,delete on public.automation_runbook_steps from service_role;grant select on public.automation_runbook_steps to service_role;

create or replace function public.guard_automation_runbook_step_immutable()
returns trigger language plpgsql set search_path='' as $$begin raise exception 'runbook_step_definition_immutable_create_new_version';end;$$;
drop trigger if exists guard_automation_runbook_step_update_trigger on public.automation_runbook_steps;create trigger guard_automation_runbook_step_update_trigger before update or delete on public.automation_runbook_steps for each row execute function public.guard_automation_runbook_step_immutable();
