-- V19: human governance actions; no restore execution.
create table if not exists public.recovery_decisions(
 id uuid primary key default gen_random_uuid(),
 decision_key text not null unique,
 objective_id uuid not null references public.recovery_objectives(id) on delete restrict,
 finding_id uuid references public.recovery_findings(id) on delete restrict,
 decision text not null check(decision in('prepare_recovery','continue_monitoring','risk_accepted')),
 note text not null check(length(note)>=10),
 actor_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.recovery_decisions enable row level security;revoke all on public.recovery_decisions from public,anon,authenticated;grant select,insert on public.recovery_decisions to service_role;

create or replace function public.acknowledge_recovery_finding(p_finding_id uuid,p_actor_id uuid,p_event_key text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.recovery_findings;begin
 select * into v from public.recovery_findings where id=p_finding_id for update;if not found then raise exception 'Finding nem található.';end if;if v.status='resolved' then raise exception 'Lezárt finding nem vehető át.';end if;
 update public.recovery_findings set status='acknowledged',acknowledged_by=p_actor_id,updated_at=now() where id=p_finding_id;
 insert into public.recovery_events(event_key,objective_id,finding_id,event_type,actor_id,metadata) values(p_event_key,v.objective_id,p_finding_id,'decision_recorded',p_actor_id,jsonb_build_object('decision','acknowledged')) on conflict(event_key) do nothing;
end;$$;
revoke all on function public.acknowledge_recovery_finding(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.acknowledge_recovery_finding(uuid,uuid,text) to service_role;

create or replace function public.record_recovery_decision(p_finding_id uuid,p_actor_id uuid,p_decision text,p_note text,p_decision_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.recovery_findings;v_id uuid;begin
 if length(trim(p_note))<10 then raise exception 'Legalább 10 karakteres indoklás szükséges.';end if;
 select * into v from public.recovery_findings where id=p_finding_id;if not found then raise exception 'Finding nem található.';end if;
 select id into v_id from public.recovery_decisions where decision_key=p_decision_key;if found then return v_id;end if;
 insert into public.recovery_decisions(decision_key,objective_id,finding_id,decision,note,actor_id) values(p_decision_key,v.objective_id,p_finding_id,p_decision,p_note,p_actor_id) returning id into v_id;
 insert into public.recovery_events(event_key,objective_id,finding_id,event_type,actor_id,metadata) values('event:'||p_decision_key,v.objective_id,p_finding_id,'decision_recorded',p_actor_id,jsonb_build_object('decision',p_decision,'note',p_note)) on conflict(event_key) do nothing;
 return v_id;
end;$$;
revoke all on function public.record_recovery_decision(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.record_recovery_decision(uuid,uuid,text,text,text) to service_role;

create or replace function public.block_recovery_decision_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Recovery decision append-only.';end;$$;
drop trigger if exists trg_recovery_decisions_append_only on public.recovery_decisions;create trigger trg_recovery_decisions_append_only before update or delete on public.recovery_decisions for each row execute function public.block_recovery_decision_mutation();
revoke update,delete on public.recovery_decisions from service_role;
