-- V14: dry-run simulation snapshots and staleness protection.
create or replace function public.simulate_action_proposal(p_proposal_id uuid,p_actor_id uuid,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path=''
as $$
declare p public.action_proposals;a public.control_alerts;v_hash text;v_snapshot jsonb;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;
 if p.status not in ('proposed','simulated') then raise exception 'proposal_not_simulatable';end if;
 if p.expires_at<=now() then raise exception 'proposal_expired';end if;
 select * into a from public.control_alerts where id=p.alert_id;
 if a.status in ('resolved','dismissed') then raise exception 'source_alert_closed';end if;
 v_snapshot:=jsonb_build_object('alert_id',a.id,'alert_key',a.alert_key,'status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'evidence',a.evidence,'proposal_payload',p.proposed_payload,'simulated_at',now());
 v_hash:=md5(v_snapshot::text);
 update public.action_proposals set status='simulated',simulation_snapshot=v_snapshot,simulation_hash=v_hash,simulated_at=now(),updated_at=now() where id=p.id returning * into p;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'simulated','proposed','simulated',p_actor_id,jsonb_build_object('simulation_hash',v_hash)) on conflict(event_key) do nothing;
 return p;
end;$$;
revoke all on function public.simulate_action_proposal(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.simulate_action_proposal(uuid,uuid,text) to service_role;

create or replace function public.action_proposal_is_stale(p_proposal_id uuid)
returns boolean language sql security definer set search_path=''
as $$select case when p.simulated_at is null then true when a.last_detected_at>p.simulated_at then true when a.status in ('resolved','dismissed') then true else false end from public.action_proposals p join public.control_alerts a on a.id=p.alert_id where p.id=p_proposal_id$$;
revoke all on function public.action_proposal_is_stale(uuid) from public,anon,authenticated;grant execute on function public.action_proposal_is_stale(uuid) to service_role;
