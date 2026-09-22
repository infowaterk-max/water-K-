-- V14: approval governance and allowlisted execution ledger.
create or replace function public.decide_action_proposal(p_proposal_id uuid,p_actor_id uuid,p_decision text,p_note text,p_event_key text)
returns public.action_proposals language plpgsql security definer set search_path=''
as $$
declare p public.action_proposals;pol public.action_policies;v_count integer;v_slot integer;begin
 if p_decision not in ('approved','rejected') then raise exception 'invalid_decision';end if;
 perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;
 select * into pol from public.action_policies where id=p.policy_id;
 if p.status not in ('simulated','approved') then raise exception 'proposal_not_approvable';end if;
 if public.action_proposal_is_stale(p.id) then raise exception 'simulation_stale';end if;
 if p.expires_at<=now() then raise exception 'proposal_expired';end if;
 if p_decision='rejected' then
  insert into public.action_approvals(proposal_id,slot,approver_id,decision,note) values(p.id,1,p_actor_id,'rejected',p_note) on conflict(proposal_id,approver_id) do nothing;
  update public.action_proposals set status='rejected',rejected_at=now(),updated_at=now() where id=p.id returning * into p;
  insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'rejected','simulated','rejected',p_actor_id,jsonb_build_object('note',p_note)) on conflict(event_key) do nothing;return p;
 end if;
 if pol.approval_mode='none' then v_slot:=1; elsif pol.approval_mode='single' then v_slot:=1; else select case when exists(select 1 from public.action_approvals where proposal_id=p.id and decision='approved') then 2 else 1 end into v_slot;end if;
 insert into public.action_approvals(proposal_id,slot,approver_id,decision,note) values(p.id,v_slot,p_actor_id,'approved',p_note);
 select count(*) into v_count from public.action_approvals where proposal_id=p.id and decision='approved';
 if pol.approval_mode<>'dual' or v_count>=2 then update public.action_proposals set status='approved',approved_at=now(),updated_at=now() where id=p.id returning * into p;end if;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,case when p.status='approved' then 'approved' else 'approval_added' end,'simulated',p.status,p_actor_id,jsonb_build_object('approval_slot',v_slot,'approval_mode',pol.approval_mode,'note',p_note)) on conflict(event_key) do nothing;
 return p;
end;$$;
revoke all on function public.decide_action_proposal(uuid,uuid,text,text,text) from public,anon,authenticated;grant execute on function public.decide_action_proposal(uuid,uuid,text,text,text) to service_role;

create or replace function public.execute_action_proposal(p_proposal_id uuid,p_actor_id uuid,p_execution_key text)
returns public.action_executions language plpgsql security definer set search_path=''
as $$
declare p public.action_proposals;e public.action_executions;v_result jsonb;begin
 if nullif(trim(p_execution_key),'') is null then raise exception 'execution_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select * into e from public.action_executions where execution_key=p_execution_key;if found then return e;end if;
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;
 if p.status<>'approved' then raise exception 'proposal_not_approved';end if;
 if public.action_proposal_is_stale(p.id) then raise exception 'simulation_stale';end if;
 if p.expires_at<=now() then raise exception 'proposal_expired';end if;
 if p.action_kind not in ('human_task','notify_admin','record_decision') then raise exception 'adapter_not_allowlisted';end if;
 v_result:=case p.action_kind when 'human_task' then jsonb_build_object('adapter','human_task','recorded',true,'note','V14 execution authorizes human follow-up only') when 'notify_admin' then jsonb_build_object('adapter','notify_admin','queued',false,'note','No external notification transport is executed by V14') else jsonb_build_object('adapter','record_decision','recorded',true) end;
 insert into public.action_executions(execution_key,proposal_id,adapter,status,input_snapshot,result,executed_by) values(p_execution_key,p.id,p.action_kind,'succeeded',coalesce(p.simulation_snapshot,'{}'::jsonb),v_result,p_actor_id) returning * into e;
 update public.action_proposals set status='executed',executed_at=now(),updated_at=now() where id=p.id;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values('execute:'||p_execution_key,p.id,'executed','approved','executed',p_actor_id,jsonb_build_object('execution_id',e.id,'adapter',e.adapter)) on conflict(event_key) do nothing;
 return e;
end;$$;
revoke all on function public.execute_action_proposal(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.execute_action_proposal(uuid,uuid,text) to service_role;
