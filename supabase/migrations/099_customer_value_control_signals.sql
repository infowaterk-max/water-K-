-- V13: customer-value control signals reuse V11 debt-aware loyalty read model without changing balances.

create or replace function public.detect_customer_value_control_alerts(p_run_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare r record;a public.control_alerts;v_debt integer:=0;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for r in
    select * from public.customer_loyalty_summary where points_debt>0
  loop
    select public.upsert_control_alert(
      'loyalty-debt:'||r.customer_id::text,
      'customer','loyalty_points_debt',case when r.points_debt>=500 then 'high' else 'warning' end,
      least(95,60+least(r.points_debt::integer,700)/20),
      'Hűségpont-egyenleg adósság · '||r.value_tier,
      'Az ügyfél auditált hűségpont-adóssága '||r.points_debt::text||' pont. A beváltást a V11 integritási szabály már blokkolja.',
      'Ellenőrizd a refund/reversal előzményt. Ne módosíts kézzel pontot bizonyíték nélkül; korrekció csak auditált loyalty bejegyzéssel történjen.',
      p_run_key,null,r.customer_id,null,null,null,
      jsonb_build_object('points_debt',r.points_debt,'points_balance',r.points_balance,'value_tier',r.value_tier,'value_score',r.value_score,'lifecycle_segment',r.lifecycle_segment,'paid_orders',r.paid_orders,'revenue_gross_huf',r.revenue_gross_huf,'last_order_at',r.last_order_at)
    ) into a;
    v_debt:=v_debt+1;
  end loop;
  return jsonb_build_object('loyalty_debt_customers',v_debt,'total',v_debt);
end;$$;
revoke all on function public.detect_customer_value_control_alerts(text) from public,anon,authenticated;
grant execute on function public.detect_customer_value_control_alerts(text) to service_role;

create or replace function public.process_control_tower_cycle(p_run_key text)
returns public.control_processing_runs language plpgsql security definer set search_path=''
as $$
declare
  run public.control_processing_runs;v_started timestamptz;v_domain jsonb;v_customer jsonb;v_system jsonb;v_resolved integer;v_tasks jsonb;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-cycle:'||p_run_key,0));
  select * into run from public.control_processing_runs where run_key=p_run_key for update;
  if found and run.completed_at is not null then return run; end if;
  if not found then insert into public.control_processing_runs(run_key) values(p_run_key) returning * into run; end if;
  v_started:=run.started_at;
  select public.detect_control_tower_alerts(p_run_key) into v_domain;
  select public.detect_customer_value_control_alerts(p_run_key) into v_customer;
  select public.detect_system_control_alerts(p_run_key) into v_system;
  select public.resolve_stale_control_alerts(v_started,p_run_key) into v_resolved;
  select public.plan_control_tasks(p_run_key) into v_tasks;
  update public.control_processing_runs set detector_result=jsonb_build_object('domain',v_domain,'customer',v_customer,'system',v_system,'auto_resolved',v_resolved),task_result=v_tasks,completed_at=now(),metadata=jsonb_build_object('safety','control_plane_only','sequence',jsonb_build_array('detect_domain','detect_customer_value','detect_system','resolve_stale','plan_human_tasks')) where id=run.id returning * into run;
  return run;
end;$$;
revoke all on function public.process_control_tower_cycle(text) from public,anon,authenticated;
grant execute on function public.process_control_tower_cycle(text) to service_role;
