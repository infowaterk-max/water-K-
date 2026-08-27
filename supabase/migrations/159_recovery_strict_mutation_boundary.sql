-- V19 audit hardening: runtime service_role uses guarded RPCs, not direct mutation.
revoke insert,update,delete on public.recovery_objectives from service_role;
revoke insert,update,delete on public.recovery_evidence from service_role;
revoke insert,update,delete on public.recovery_drills from service_role;
revoke insert,update,delete on public.recovery_findings from service_role;
revoke insert,update,delete on public.recovery_events from service_role;
revoke insert,update,delete on public.recovery_decisions from service_role;
revoke insert,update,delete on public.recovery_runs from service_role;
grant select on public.recovery_objectives,public.recovery_evidence,public.recovery_drills,public.recovery_findings,public.recovery_events,public.recovery_decisions,public.recovery_runs to service_role;

create or replace function public.block_recovery_objective_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Recovery objective verzión belül immutable; új definícióhoz új verzió szükséges.';end;$$;
drop trigger if exists trg_recovery_objectives_immutable on public.recovery_objectives;create trigger trg_recovery_objectives_immutable before update or delete on public.recovery_objectives for each row execute function public.block_recovery_objective_mutation();

create or replace function public.block_terminal_recovery_drill_mutation() returns trigger language plpgsql set search_path='' as $$begin if old.status in('passed','failed','cancelled') then raise exception 'Lezárt recovery drill immutable.';end if;return new;end;$$;
drop trigger if exists trg_recovery_drills_terminal on public.recovery_drills;create trigger trg_recovery_drills_terminal before update on public.recovery_drills for each row execute function public.block_terminal_recovery_drill_mutation();
