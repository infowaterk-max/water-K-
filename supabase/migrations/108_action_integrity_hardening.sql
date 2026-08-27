-- V14 audit hardening: immutable identities, append-only ledgers and approval invariants.
create or replace function public.guard_action_policy_identity() returns trigger language plpgsql set search_path='' as $$begin if new.policy_key is distinct from old.policy_key or new.version is distinct from old.version then raise exception 'policy_identity_immutable';end if;return new;end;$$;
drop trigger if exists guard_action_policy_identity_trigger on public.action_policies;create trigger guard_action_policy_identity_trigger before update on public.action_policies for each row execute function public.guard_action_policy_identity();
create or replace function public.guard_action_proposal_identity() returns trigger language plpgsql set search_path='' as $$begin if new.proposal_key is distinct from old.proposal_key or new.alert_id is distinct from old.alert_id or new.policy_id is distinct from old.policy_id or new.action_kind is distinct from old.action_kind or new.impact_class is distinct from old.impact_class then raise exception 'proposal_identity_immutable';end if;return new;end;$$;
drop trigger if exists guard_action_proposal_identity_trigger on public.action_proposals;create trigger guard_action_proposal_identity_trigger before update on public.action_proposals for each row execute function public.guard_action_proposal_identity();
create or replace function public.reject_append_only_action_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'append_only_ledger';end;$$;
drop trigger if exists action_events_append_only_trigger on public.action_proposal_events;create trigger action_events_append_only_trigger before update or delete on public.action_proposal_events for each row execute function public.reject_append_only_action_mutation();
drop trigger if exists action_executions_append_only_trigger on public.action_executions;create trigger action_executions_append_only_trigger before update or delete on public.action_executions for each row execute function public.reject_append_only_action_mutation();
drop trigger if exists action_approvals_append_only_trigger on public.action_approvals;create trigger action_approvals_append_only_trigger before update or delete on public.action_approvals for each row execute function public.reject_append_only_action_mutation();

-- A proposal cannot be approved without a simulation and cannot leave terminal states.
create or replace function public.guard_action_proposal_status() returns trigger language plpgsql set search_path='' as $$begin
 if old.status in ('rejected','expired','executed','cancelled') and new.status is distinct from old.status then raise exception 'terminal_proposal_state';end if;
 if new.status='approved' and new.simulated_at is null then raise exception 'approval_requires_simulation';end if;
 if new.status='executed' and old.status<>'approved' then raise exception 'execution_requires_approved_state';end if;
 return new;end;$$;
drop trigger if exists guard_action_proposal_status_trigger on public.action_proposals;create trigger guard_action_proposal_status_trigger before update of status on public.action_proposals for each row execute function public.guard_action_proposal_status();

-- Explicit source grants for security-invoker V14 views and policy engine.
grant select on public.control_alerts,public.control_tasks to service_role;
