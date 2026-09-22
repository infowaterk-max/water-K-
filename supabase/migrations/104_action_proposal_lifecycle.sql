-- V14: deterministic policy matching and proposal lifecycle.
create or replace function public.plan_action_proposals(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare a record;p record;v_count integer:=0;v_rank integer;v_min integer;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged','snoozed') loop
  v_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;
  for p in select * from public.action_policies where enabled and category=a.category and (alert_type is null or alert_type=a.alert_type) order by version desc loop
   v_min:=case p.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;
   if v_rank<v_min then continue; end if;
   insert into public.action_proposals(proposal_key,alert_id,policy_id,action_kind,impact_class,risk_score,rationale,proposed_payload,source_snapshot,expires_at)
   values('alert:'||a.id::text||':policy:'||p.policy_key||':v'||p.version,a.id,p.id,p.action_kind,p.impact_class,least(100,greatest(a.priority_score,case p.impact_class when 'high_impact' then 85 when 'reversible' then 60 else 30 end)),
    'V14 policy '||p.policy_key||' matched active V13 alert '||a.alert_key,p.action_template,
    jsonb_build_object('alert_key',a.alert_key,'alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'evidence',a.evidence),
    now()+(p.expires_after_hours||' hours')::interval)
   on conflict(proposal_key) do update set risk_score=excluded.risk_score,rationale=excluded.rationale,source_snapshot=excluded.source_snapshot,updated_at=now()
   where public.action_proposals.status in ('proposed','simulated');
   if found then v_count:=v_count+1; end if;
   exit;
  end loop;
 end loop;
 return jsonb_build_object('proposals_upserted',v_count);
end;$$;
revoke all on function public.plan_action_proposals(text) from public,anon,authenticated;grant execute on function public.plan_action_proposals(text) to service_role;

create or replace function public.expire_or_cancel_action_proposals(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r record;v_exp integer:=0;v_cancel integer:=0;begin
 for r in select p.*,a.status as alert_status from public.action_proposals p join public.control_alerts a on a.id=p.alert_id where p.status in ('proposed','simulated','approved') loop
  if r.expires_at<=now() then
   update public.action_proposals set status='expired',updated_at=now() where id=r.id and status in ('proposed','simulated','approved');
   if found then insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,metadata) values('expire:'||p_run_key||':'||r.id,r.id,'expired',r.status,'expired','{}') on conflict do nothing;v_exp:=v_exp+1;end if;
  elsif r.alert_status in ('resolved','dismissed') then
   update public.action_proposals set status='cancelled',cancelled_at=now(),updated_at=now() where id=r.id and status in ('proposed','simulated','approved');
   if found then insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,metadata) values('cancel:'||p_run_key||':'||r.id,r.id,'cancelled',r.status,'cancelled',jsonb_build_object('reason','source_alert_closed')) on conflict do nothing;v_cancel:=v_cancel+1;end if;
  end if;
 end loop;
 return jsonb_build_object('expired',v_exp,'cancelled',v_cancel);
end;$$;
revoke all on function public.expire_or_cancel_action_proposals(text) from public,anon,authenticated;grant execute on function public.expire_or_cancel_action_proposals(text) to service_role;
