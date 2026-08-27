-- V18: cycle orchestration and rollback recommendation decisions.
create table if not exists public.post_release_rollback_decisions(
 id uuid primary key default gen_random_uuid(),decision_key text not null unique,session_id uuid not null references public.post_release_sessions(id) on delete restrict,
 decision text not null check(decision in('rollback_authorized','continue_observation','risk_accepted')),actor_id uuid not null references auth.users(id) on delete restrict,
 note text not null,session_evidence_hash text not null,created_at timestamptz not null default now()
);
alter table public.post_release_rollback_decisions enable row level security;revoke all on public.post_release_rollback_decisions from public,anon,authenticated;grant select,insert on public.post_release_rollback_decisions to service_role;

create or replace function public.decide_post_release_rollback(p_session_id uuid,p_actor_id uuid,p_decision text,p_note text,p_event_key text)
returns public.post_release_rollback_decisions language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;d public.post_release_rollback_decisions;v_hash text;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status not in('degraded','rollback_recommended') then raise exception 'Rollback döntés csak degradált állapotban adható.';end if;
 if p_decision not in('rollback_authorized','continue_observation','risk_accepted') then raise exception 'Érvénytelen rollback döntés.';end if;
 if length(trim(coalesce(p_note,'')))<10 then raise exception 'A döntés indoklása kötelező.';end if;
 select md5(coalesce(string_agg(evidence_hash,'|' order by evidence_hash),'')) into v_hash from public.post_release_evidence where session_id=s.id;
 select * into d from public.post_release_rollback_decisions where decision_key=p_event_key;if found then
  if d.session_id<>s.id or d.actor_id<>p_actor_id or d.decision<>p_decision then raise exception 'A döntési kulcs már más művelethez tartozik.';end if;return d;end if;
 insert into public.post_release_rollback_decisions(decision_key,session_id,decision,actor_id,note,session_evidence_hash)
 values(p_event_key,s.id,p_decision,p_actor_id,trim(p_note),v_hash) returning * into d;
 return d;end;$$;
revoke all on function public.decide_post_release_rollback(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.decide_post_release_rollback(uuid,uuid,text,text,text) to service_role;

create or replace function public.process_post_release_cycle(p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s record;v_count int:=0;v_result jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'Run key kötelező.';end if;
 for s in select id from public.post_release_sessions where status not in('closed','cancelled') order by started_at loop
   v_result:=public.reconcile_post_release_session(s.id,p_run_key);v_count:=v_count+1;
 end loop;
 return jsonb_build_object('processed',v_count,'run_key',p_run_key);end;$$;
revoke all on function public.process_post_release_cycle(text) from public,anon,authenticated;grant execute on function public.process_post_release_cycle(text) to service_role;

create or replace view public.post_release_rollback_queue with(security_invoker=true) as
select q.*,d.decision as latest_decision,d.note as latest_decision_note,d.created_at as latest_decision_at
from public.post_release_session_queue q left join lateral(select * from public.post_release_rollback_decisions x where x.session_id=q.session_id order by x.created_at desc limit 1)d on true
where q.status in('degraded','rollback_recommended');
revoke all on public.post_release_rollback_queue from public,anon,authenticated;grant select on public.post_release_rollback_queue to service_role;
