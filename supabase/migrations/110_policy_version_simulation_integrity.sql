-- V14: immutable versioned policy definitions and policy-aware simulation staleness.
create or replace function public.guard_action_policy_version_definition() returns trigger language plpgsql set search_path='' as $$begin
 if new.policy_key is distinct from old.policy_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.alert_type is distinct from old.alert_type or new.min_severity is distinct from old.min_severity or new.action_kind is distinct from old.action_kind or new.impact_class is distinct from old.impact_class or new.approval_mode is distinct from old.approval_mode or new.expires_after_hours is distinct from old.expires_after_hours or new.action_template is distinct from old.action_template or new.conditions is distinct from old.conditions then raise exception 'policy_version_definition_immutable_create_new_version';end if;new.updated_at:=now();return new;end;$$;
drop trigger if exists guard_action_policy_identity_trigger on public.action_policies;drop trigger if exists guard_action_policy_version_definition_trigger on public.action_policies;create trigger guard_action_policy_version_definition_trigger before update on public.action_policies for each row execute function public.guard_action_policy_version_definition();

create or replace function public.action_proposal_is_stale(p_proposal_id uuid)
returns boolean language sql security definer set search_path=''
as $$select case when p.simulated_at is null then true when a.last_detected_at>p.simulated_at then true when a.status in ('resolved','dismissed') then true when not pol.enabled then true else false end from public.action_proposals p join public.control_alerts a on a.id=p.alert_id join public.action_policies pol on pol.id=p.policy_id where p.id=p_proposal_id$$;
revoke all on function public.action_proposal_is_stale(uuid) from public,anon,authenticated;grant execute on function public.action_proposal_is_stale(uuid) to service_role;

create or replace function public.plan_action_proposals(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$declare a record;p record;v_count integer:=0;v_rank integer;v_min integer;v_min_priority integer;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged','snoozed') loop
  v_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;
  for p in select distinct on(policy_key) * from public.action_policies where enabled and category=a.category and (alert_type is null or alert_type=a.alert_type) order by policy_key,version desc loop
   v_min:=case p.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;v_min_priority:=coalesce((p.conditions->>'min_priority_score')::integer,0);
   if v_rank<v_min or a.priority_score<v_min_priority then continue;end if;
   insert into public.action_proposals(proposal_key,alert_id,policy_id,action_kind,impact_class,risk_score,rationale,proposed_payload,source_snapshot,expires_at)
   values('alert:'||a.id::text||':policy:'||p.policy_key||':v'||p.version,a.id,p.id,p.action_kind,p.impact_class,least(100,greatest(a.priority_score,case p.impact_class when 'high_impact' then 85 when 'reversible' then 60 else 30 end)),'V14 policy '||p.policy_key||' matched active V13 alert '||a.alert_key,p.action_template,jsonb_build_object('alert_key',a.alert_key,'alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'evidence',a.evidence),now()+(p.expires_after_hours||' hours')::interval)
   on conflict(proposal_key) do update set risk_score=excluded.risk_score,rationale=excluded.rationale,source_snapshot=excluded.source_snapshot,updated_at=now() where public.action_proposals.status in ('proposed','simulated');
   if found then v_count:=v_count+1;end if;
  end loop;
 end loop;return jsonb_build_object('proposals_upserted',v_count);end;$$;
revoke all on function public.plan_action_proposals(text) from public,anon,authenticated;grant execute on function public.plan_action_proposals(text) to service_role;
