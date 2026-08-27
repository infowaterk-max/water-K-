-- V13 final lifecycle hygiene: a new incident must not inherit acknowledgement/closure metadata from a prior incident.
create or replace function public.maintain_control_incident_started_at()
returns trigger language plpgsql security invoker set search_path=''
as $$begin
  if new.status='open' and old.status in ('resolved','dismissed') and old.status is distinct from new.status then
    new.incident_started_at:=now();
    new.acknowledged_at:=null;
    new.acknowledged_by:=null;
    new.snoozed_until:=null;
    new.resolved_at:=null;
    new.resolved_by:=null;
    new.dismissed_at:=null;
    new.dismissed_by:=null;
  end if;
  return new;
end;$$;
revoke all on function public.maintain_control_incident_started_at() from public,anon,authenticated;
