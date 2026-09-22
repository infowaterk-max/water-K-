-- V17: staleness, approvals and terminal governance.
create or replace function public.release_candidate_is_stale(p_candidate_id uuid)
returns boolean language sql security definer set search_path=''
as $$with c as(select * from public.release_candidates where id=p_candidate_id),pol as(select p.* from public.release_policies p join c on c.policy_id=p.id),latest as(select * from public.assurance_recent_runs where status='completed' order by completed_at desc nulls last limit 1)
select case when c.evaluated_at is null then true when c.expires_at<=now() then true when not pol.enabled then true when latest.id is null then true when c.assurance_bundle_hash is distinct from latest.evidence_bundle_hash then true when pol.require_ci_green and(c.ci_status<>'success' or c.ci_observed_at is null or c.ci_observed_at<now()-make_interval(mins=>pol.ci_freshness_minutes)) then true else false end from c join pol on true left join latest on true$$;
revoke all on function public.release_candidate_is_stale(uuid) from public,anon,authenticated;grant execute on function public.release_candidate_is_stale(uuid) to service_role;

create or replace function public.decide_release_candidate(p_candidate_id uuid,p_actor_id uuid,p_decision text,p_note text,p_event_key text)
returns public.release_candidates language plpgsql security definer set search_path=''
as $$declare c public.release_candidates;pol public.release_policies;ev public.release_events;v_slot integer;v_count integer;begin
 if p_decision not in('approved','rejected') then raise exception 'invalid_decision';end if;perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));
 select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;
 select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;select * into pol from public.release_policies where id=c.policy_id;
 if p_decision='rejected' then if c.status not in('ready','evaluated') then raise exception 'candidate_not_rejectable';end if;insert into public.release_approvals(candidate_id,slot,approver_id,decision,note) values(c.id,1,p_actor_id,'rejected',p_note);update public.release_candidates set status='rejected',rejected_at=now(),updated_at=now() where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'rejected',p_actor_id,jsonb_build_object('note',p_note));return c;end if;
 if c.status not in('ready') then raise exception 'candidate_not_ready';end if;if public.release_candidate_is_stale(c.id) then raise exception 'release_evidence_stale';end if;
 select case when exists(select 1 from public.release_approvals where candidate_id=c.id and decision='approved') then 2 else 1 end into v_slot;if pol.approval_mode='single' then v_slot:=1;end if;
 insert into public.release_approvals(candidate_id,slot,approver_id,decision,note) values(c.id,v_slot,p_actor_id,'approved',p_note);
 select count(*) into v_count from public.release_approvals where candidate_id=c.id and decision='approved';
 if pol.approval_mode='single' or v_count>=2 then update public.release_candidates set status='approved',approved_at=now(),updated_at=now() where id=c.id returning * into c;end if;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,case when c.status='approved' then 'approved' else 'approval_added' end,p_actor_id,jsonb_build_object('slot',v_slot,'approval_mode',pol.approval_mode,'note',p_note));return c;end;$$;
revoke all on function public.decide_release_candidate(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.decide_release_candidate(uuid,uuid,text,text,text) to service_role;

create or replace function public.expire_stale_release_candidates(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare c record;v_exp integer:=0;begin for c in select * from public.release_candidates where status in('ready','evaluated') loop if c.expires_at<=now() or public.release_candidate_is_stale(c.id) then update public.release_candidates set status='expired',updated_at=now() where id=c.id and status in('ready','evaluated');if found then insert into public.release_events(event_key,candidate_id,event_type,metadata) values('expire:'||p_run_key||':'||c.id,c.id,'expired',jsonb_build_object('reason','stale_or_expired')) on conflict(event_key) do nothing;v_exp:=v_exp+1;end if;end if;end loop;return jsonb_build_object('expired',v_exp);end;$$;
revoke all on function public.expire_stale_release_candidates(text) from public,anon,authenticated;grant execute on function public.expire_stale_release_candidates(text) to service_role;
