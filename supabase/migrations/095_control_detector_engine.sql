-- V13: deterministic alert upsert/reopen semantics and cross-domain detectors.

create or replace function public.upsert_control_alert(
  p_alert_key text,p_category text,p_alert_type text,p_severity text,p_priority_score integer,
  p_title text,p_description text,p_recommended_action text,p_run_key text,
  p_order_id uuid default null,p_customer_id uuid default null,p_reseller_id uuid default null,
  p_variant_id uuid default null,p_opportunity_id uuid default null,p_evidence jsonb default '{}'::jsonb
) returns public.control_alerts
language plpgsql security definer set search_path=''
as $$
declare
  a public.control_alerts;
  v_old_status text;
  v_old_severity text;
  v_new_status text;
  v_event_type text;
  v_old_rank integer;
  v_new_rank integer;
begin
  if nullif(trim(p_alert_key),'') is null or nullif(trim(p_run_key),'') is null then raise exception 'alert_key_and_run_key_required'; end if;
  if p_category not in ('operations','inventory','service','commercial','customer','system') then raise exception 'invalid_alert_category'; end if;
  if p_severity not in ('info','warning','high','critical') then raise exception 'invalid_alert_severity'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-alert-key:'||p_alert_key,0));
  select * into a from public.control_alerts where alert_key=p_alert_key for update;

  if not found then
    insert into public.control_alerts(alert_key,category,alert_type,severity,priority_score,title,description,recommended_action,order_id,customer_id,reseller_id,variant_id,opportunity_id,evidence)
    values(p_alert_key,p_category,p_alert_type,p_severity,greatest(0,least(100,p_priority_score)),p_title,p_description,p_recommended_action,p_order_id,p_customer_id,p_reseller_id,p_variant_id,p_opportunity_id,coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('source','v13_detector','detector_run_key',p_run_key))
    returning * into a;
    insert into public.control_alert_events(event_key,alert_id,event_type,to_status,metadata)
    values('detect:'||p_run_key||':'||p_alert_key,a.id,'detected','open',jsonb_build_object('severity',p_severity,'priority_score',p_priority_score));
    return a;
  end if;

  v_old_status:=a.status;v_old_severity:=a.severity;
  v_old_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;
  v_new_rank:=case p_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;
  v_new_status:=a.status;
  if a.status='resolved' then v_new_status:='open';
  elsif a.status='snoozed' and a.snoozed_until is not null and a.snoozed_until<=now() then v_new_status:='open';
  elsif a.status='dismissed' and v_new_rank>v_old_rank then v_new_status:='open';
  end if;

  update public.control_alerts set
    category=p_category,alert_type=p_alert_type,severity=p_severity,priority_score=greatest(0,least(100,p_priority_score)),
    title=p_title,description=p_description,recommended_action=p_recommended_action,
    order_id=coalesce(p_order_id,order_id),customer_id=coalesce(p_customer_id,customer_id),reseller_id=coalesce(p_reseller_id,reseller_id),variant_id=coalesce(p_variant_id,variant_id),opportunity_id=coalesce(p_opportunity_id,opportunity_id),
    evidence=coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('source','v13_detector','detector_run_key',p_run_key),
    occurrence_count=occurrence_count+1,last_detected_at=now(),status=v_new_status,
    snoozed_until=case when v_new_status='open' then null else snoozed_until end,
    resolved_at=case when v_new_status='open' then null else resolved_at end,resolved_by=case when v_new_status='open' then null else resolved_by end,
    dismissed_at=case when v_new_status='open' then null else dismissed_at end,dismissed_by=case when v_new_status='open' then null else dismissed_by end,
    updated_at=now()
  where id=a.id returning * into a;

  v_event_type:=case when v_old_status<>v_new_status and v_new_status='open' then 'reopened' else 'redetected' end;
  insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata)
  values('detect:'||p_run_key||':'||p_alert_key,a.id,v_event_type,v_old_status,v_new_status,jsonb_build_object('old_severity',v_old_severity,'severity',p_severity,'priority_score',p_priority_score))
  on conflict(event_key) do nothing;
  return a;
end;$$;
revoke all on function public.upsert_control_alert(text,text,text,text,integer,text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_control_alert(text,text,text,text,integer,text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.detect_control_tower_alerts(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  r record;
  a public.control_alerts;
  v_operations integer:=0;v_inventory integer:=0;v_commercial integer:=0;v_service integer:=0;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;

  for r in select * from public.operations_exception_queue loop
    select public.upsert_control_alert(
      'ops:'||r.order_id::text||':'||coalesce(r.derived_exception_code,'attention'),
      'operations',coalesce(r.derived_exception_code,'operations_attention'),
      case when r.derived_exception_code in ('payment_fulfillment_mismatch','shipment_status_mismatch','delivery_status_mismatch') then 'critical'
           when r.age_hours>=48 or r.urgent_support_count>0 then 'high' else 'warning' end,
      least(100,greatest(coalesce(r.priority_score,0),case when r.age_hours>=48 then 90 when r.age_hours>=24 then 75 else 60 end)),
      'Rendelési operációs kivétel · '||r.order_number,
      'A rendelés operációs ellenőrzést igényel: '||coalesce(r.derived_exception_code,'figyelmet igénylő állapot')||'.',
      case when r.derived_exception_code like '%mismatch%' then 'Ellenőrizd a kereskedelmi és fulfillment állapotot, majd csak igazolt állapot alapján korrigálj.' else 'Nyisd meg a rendelést és kezeld a kivétel okát.' end,
      p_run_key,r.order_id,null,null,null,null,
      jsonb_build_object('order_number',r.order_number,'commerce_status',r.commerce_status,'operational_status',r.operational_status,'age_hours',r.age_hours,'total_gross_huf',r.total_gross_huf,'exception_code',r.derived_exception_code,'urgent_support_count',r.urgent_support_count,'open_return_count',r.open_return_count)
    ) into a;
    v_operations:=v_operations+1;
  end loop;

  for r in select * from public.inventory_pressure where pressure_level in ('critical','low') loop
    select public.upsert_control_alert(
      'inventory:'||r.variant_id::text||':'||r.pressure_level,
      'inventory','inventory_pressure',case when r.pressure_level='critical' then 'critical' else 'warning' end,
      case when r.pressure_level='critical' then 95 else least(85,60+coalesce(round(r.reservation_pressure_percent)::integer,0)/4) end,
      'Készletnyomás · '||r.sku,
      'A '||r.label||' variáns szabad ATP készlete: '||r.available_to_promise_quantity::text||' db.',
      case when r.pressure_level='critical' then 'Vizsgáld meg a beszerzést és a nyitott igényeket; ne ígérj kézzel nem létező készletet.' else 'Ellenőrizd a fogyási ütemet és a következő beszerzési pontot.' end,
      p_run_key,null,null,null,r.variant_id,null,
      jsonb_build_object('sku',r.sku,'label',r.label,'on_hand_quantity',r.on_hand_quantity,'reserved_quantity',r.reserved_quantity,'available_to_promise_quantity',r.available_to_promise_quantity,'reservation_pressure_percent',r.reservation_pressure_percent,'pressure_level',r.pressure_level)
    ) into a;
    v_inventory:=v_inventory+1;
  end loop;

  for r in
    select * from public.commercial_opportunities
    where status in ('open','in_progress') and (priority_score>=70 or due_at<now() or expected_value_net_huf>=100000)
  loop
    select public.upsert_control_alert(
      'commercial:'||r.id::text,
      'commercial','commercial_opportunity_risk',
      case when r.due_at<now() and r.priority_score>=80 then 'high' when r.priority_score>=80 then 'high' else 'warning' end,
      greatest(r.priority_score,case when r.due_at<now() then 80 else 0 end),
      'Kereskedelmi lehetőség · '||r.channel||' / '||r.kind,
      'Nyitott lehetőség várható nettó értéke '||round(r.expected_value_net_huf)::text||' Ft, prioritása '||r.priority_score::text||'.',
      coalesce(r.recommended_action,'Vizsgáld meg a következő emberi kereskedelmi lépést.'),
      p_run_key,null,r.customer_id,r.reseller_id,null,r.id,
      jsonb_build_object('channel',r.channel,'kind',r.kind,'status',r.status,'expected_value_net_huf',r.expected_value_net_huf,'probability_percent',r.probability_percent,'due_at',r.due_at,'reason',r.reason)
    ) into a;
    v_commercial:=v_commercial+1;
  end loop;

  for r in
    select st.id,st.ticket_number,st.order_id,st.user_id,st.priority,st.status,st.category,st.subject,st.created_at
    from public.support_tickets st
    where st.status in ('open','in_progress','waiting_customer') and (st.priority in ('high','urgent') or st.created_at<now()-interval '48 hours')
  loop
    select public.upsert_control_alert(
      'service-ticket:'||r.id::text,
      'service','support_attention',case when r.priority='urgent' then 'critical' when r.priority='high' then 'high' else 'warning' end,
      case when r.priority='urgent' then 95 when r.priority='high' then 85 else 70 end,
      'Ügyfélszolgálati figyelem · '||r.ticket_number,
      'Nyitott '||r.priority||' prioritású ügy: '||r.subject,
      'Vizsgáld meg az ügyet és rögzíts következő lépést az ügyfélszolgálati folyamatban.',
      p_run_key,r.order_id,r.user_id,null,null,null,
      jsonb_build_object('ticket_id',r.id,'ticket_number',r.ticket_number,'priority',r.priority,'status',r.status,'category',r.category,'created_at',r.created_at)
    ) into a;
    v_service:=v_service+1;
  end loop;

  return jsonb_build_object('operations',v_operations,'inventory',v_inventory,'commercial',v_commercial,'service',v_service,'total',v_operations+v_inventory+v_commercial+v_service);
end;$$;
revoke all on function public.detect_control_tower_alerts(text) from public,anon,authenticated;
grant execute on function public.detect_control_tower_alerts(text) to service_role;

create or replace function public.resolve_stale_control_alerts(p_cycle_started_at timestamptz,p_run_key text)
returns integer language plpgsql security definer set search_path=''
as $$
declare r record;v_count integer:=0;begin
  for r in
    select * from public.control_alerts
    where status in ('open','acknowledged','snoozed')
      and evidence->>'source'='v13_detector'
      and last_detected_at<p_cycle_started_at
  loop
    update public.control_alerts set status='resolved',resolved_at=now(),resolved_by=null,updated_at=now(),evidence=evidence||jsonb_build_object('auto_resolved',true,'auto_resolved_run_key',p_run_key) where id=r.id;
    update public.control_tasks set status='cancelled',updated_at=now(),outcome=coalesce(outcome,'A detektor szerint a kiváltó feltétel megszűnt') where alert_id=r.id and status in ('open','in_progress');
    insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata)
    values('auto-resolve:'||p_run_key||':'||r.id::text,r.id,'resolved',r.status,'resolved',jsonb_build_object('reason','condition_not_redetected'))
    on conflict(event_key) do nothing;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;$$;
revoke all on function public.resolve_stale_control_alerts(timestamptz,text) from public,anon,authenticated;
grant execute on function public.resolve_stale_control_alerts(timestamptz,text) to service_role;
