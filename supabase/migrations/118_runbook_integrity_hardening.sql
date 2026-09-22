-- V15 audit hardening: immutable definitions/identity, safe resume and global pause controls.
create or replace function public.guard_automation_runbook_identity()
returns trigger language plpgsql set search_path=''
as $$begin
 if new.runbook_key is distinct from old.runbook_key or new.version is distinct from old.version or new.category is distinct from old.category or new.risk_class is distinct from old.risk_class or new.requires_action_approval is distinct from old.requires_action_approval or new.definition is distinct from old.definition then raise exception 'runbook_version_definition_immutable';end if;return new;end;$$;
drop trigger if exists guard_automation_runbook_identity_trigger on public.automation_runbooks;create trigger guard_automation_runbook_identity_trigger before update on public.automation_runbooks for each row execute function public.guard_automation_runbook_identity();

create or replace function public.guard_automation_instance_identity()
returns trigger language plpgsql set search_path=''
as $$begin if new.instance_key is distinct from old.instance_key or new.runbook_id is distinct from old.runbook_id or new.alert_id is distinct from old.alert_id or new.proposal_id is distinct from old.proposal_id then raise exception 'automation_instance_identity_immutable';end if;return new;end;$$;
drop trigger if exists guard_automation_instance_identity_trigger on public.automation_runbook_instances;create trigger guard_automation_instance_identity_trigger before update on public.automation_runbook_instances for each row execute function public.guard_automation_instance_identity();

create or replace function public.guard_automation_event_immutable()
returns trigger language plpgsql set search_path='' as $$begin raise exception 'automation_events_append_only';end;$$;
drop trigger if exists guard_automation_event_update_trigger on public.automation_events;create trigger guard_automation_event_update_trigger before update or delete on public.automation_events for each row execute function public.guard_automation_event_immutable();
revoke update,delete on public.automation_events from service_role;

create or replace function public.transition_automation_instance(p_instance_id uuid,p_actor_id uuid,p_target text,p_event_key text,p_reason text default null)
returns public.automation_runbook_instances language plpgsql security definer set search_path=''
as $$
declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;c public.automation_control;e public.automation_events;begin
 if p_target not in ('paused','active','cancelled') then raise exception 'invalid_target';end if;if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 select * into e from public.automation_events where event_key=p_event_key;if found then if e.instance_id<>p_instance_id or e.event_type<>p_target then raise exception 'event_key_conflict';end if;select * into i from public.automation_runbook_instances where id=p_instance_id;return i;end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;
 if p_target='paused' and i.status<>'active' then raise exception 'instance_not_pausable';end if;
 if p_target='active' then
   if i.status<>'paused' then raise exception 'instance_not_resumable';end if;select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;
   select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
   if r.requires_action_approval then if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;end if;
 end if;
 if p_target='cancelled' and i.status not in ('planned','active','paused') then raise exception 'instance_not_cancellable';end if;
 update public.automation_runbook_instances set status=p_target,paused_at=case when p_target='paused' then now() when p_target='active' then null else paused_at end,cancelled_at=case when p_target='cancelled' then now() else cancelled_at end,updated_at=now() where id=i.id returning * into i;
 if p_target='cancelled' then update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');end if;
 insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values(p_event_key,i.id,p_target,p_actor_id,jsonb_build_object('reason',p_reason));return i;
end;$$;
revoke all on function public.transition_automation_instance(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.transition_automation_instance(uuid,uuid,text,text,text) to service_role;

create or replace function public.set_automation_global_pause(p_actor_id uuid,p_paused boolean,p_reason text,p_event_key text)
returns public.automation_control language plpgsql security definer set search_path=''
as $$declare c public.automation_control;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-global-control',0));
 update public.automation_control set global_paused=p_paused,pause_reason=case when p_paused then coalesce(nullif(trim(p_reason),''),'Kézi szüneteltetés') else null end,updated_at=now() where singleton=true returning * into c;
 return c;end;$$;
revoke all on function public.set_automation_global_pause(uuid,boolean,text,text) from public,anon,authenticated;grant execute on function public.set_automation_global_pause(uuid,boolean,text,text) to service_role;
