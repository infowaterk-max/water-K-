-- Tenant-safe merchant Control Tower. Platform/system-health signals intentionally remain outside merchant scope.
create or replace function public.upsert_control_alert_v2(p_instance_id uuid,p_alert_key text,p_category text,p_alert_type text,p_severity text,p_priority_score integer,p_title text,p_description text,p_recommended_action text,p_run_key text,p_order_id uuid default null,p_customer_id uuid default null,p_reseller_id uuid default null,p_variant_id uuid default null,p_opportunity_id uuid default null,p_evidence jsonb default '{}'::jsonb)
returns public.control_alerts language plpgsql security definer set search_path=public as $$declare r public.control_alerts;begin
 if p_instance_id is null then raise exception 'instance_id_required';end if;perform set_config('shoperation.instance_id',p_instance_id::text,true);
 select public.upsert_control_alert(p_instance_id::text||':'||p_alert_key,p_category,p_alert_type,p_severity,p_priority_score,p_title,p_description,p_recommended_action,p_instance_id::text||':'||p_run_key,p_order_id,p_customer_id,p_reseller_id,p_variant_id,p_opportunity_id,coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('store_instance_id',p_instance_id)) into r;
 if r.instance_id is distinct from p_instance_id then raise exception 'tenant_mismatch';end if;return r;
end$$;

create or replace function public.detect_merchant_control_alerts_v2(p_instance_id uuid,p_run_key text) returns jsonb language plpgsql security definer set search_path=public as $$declare x record;v_orders int:=0;v_inventory int:=0;v_customer int:=0;v_commercial int:=0;begin
 -- Operations: stale pending orders.
 for x in select id,order_number,customer_id,total_gross_huf,created_at,extract(epoch from now()-created_at)/3600 age_hours from public.orders where instance_id=p_instance_id and status='pending' and created_at<=now()-interval '24 hours' loop
  perform public.upsert_control_alert_v2(p_instance_id,'order-pending:'||x.id,'operations','pending_order',case when x.age_hours>=72 then 'high' else 'warning' end,least(100,55+floor(x.age_hours/12)::int),'Fizetésre váró rendelés · '||x.order_number,'A rendelés több mint 24 órája függő állapotú.','Ellenőrizd a fizetést és az ügyfélkapcsolatot.',p_run_key,x.id,x.customer_id,null,null,null,jsonb_build_object('detector','merchant_orders_v2','age_hours',x.age_hours,'order_total_gross_huf',x.total_gross_huf));v_orders:=v_orders+1;
 end loop;
 -- Inventory: active low/out-of-stock variants.
 for x in select id,sku,label,stock_quantity from public.product_variants where instance_id=p_instance_id and active=true and stock_quantity<=5 loop
  perform public.upsert_control_alert_v2(p_instance_id,'inventory-low:'||x.id,'inventory','low_stock',case when x.stock_quantity<=0 then 'critical' else 'warning' end,case when x.stock_quantity<=0 then 95 else 65 end,'Készletjelzés · '||coalesce(x.label,x.sku),'Az aktív variáns készlete alacsony vagy elfogyott.','Ellenőrizd a beszerzést és a készletbeállításokat.',p_run_key,null,null,null,x.id,null,jsonb_build_object('detector','merchant_inventory_v2','stock_quantity',x.stock_quantity,'sku',x.sku));v_inventory:=v_inventory+1;
 end loop;
 -- Customer value: valuable at-risk / winback customers.
 for x in select customer_id,email_key,lifecycle_segment,value_score,revenue_gross_huf,days_since_last_order from public.customer_value_profiles where instance_id=p_instance_id and lifecycle_segment in('at_risk','winback','dormant') and value_score>=40 loop
  perform public.upsert_control_alert_v2(p_instance_id,'customer-retention:'||x.customer_id,'customer','retention_risk',case when x.value_score>=75 then 'high' else 'warning' end,least(100,40+x.value_score/2),'Ügyfélmegtartási kockázat','Értékes ügyfél inaktív életciklus-szegmensbe került.','Indíts célzott, hozzájárulás-alapú megtartási folyamatot.',p_run_key,null,x.customer_id,null,null,null,jsonb_build_object('detector','merchant_customer_value_v2','email_key',x.email_key,'segment',x.lifecycle_segment,'value_score',x.value_score,'revenue_gross_huf',x.revenue_gross_huf,'days_since_last_order',x.days_since_last_order));v_customer:=v_customer+1;
 end loop;
 -- Commercial: overdue or high-priority open opportunities.
 for x in select id,customer_id,reseller_id,status,priority_score,expected_value_net_huf,due_at,reason,recommended_action from public.commercial_opportunities where instance_id=p_instance_id and status not in('won','lost','cancelled') and(due_at<now() or priority_score>=80) loop
  perform public.upsert_control_alert_v2(p_instance_id,'commercial-opportunity:'||x.id,'commercial','opportunity_attention',case when x.priority_score>=90 or x.due_at<now()-interval '2 days' then 'high' else 'warning' end,greatest(60,x.priority_score),'Értékesítési lehetőség figyelmet igényel',coalesce(x.reason,'A lehetőség határideje vagy prioritása beavatkozást indokol.'),coalesce(x.recommended_action,'Ellenőrizd a következő kereskedelmi lépést.'),p_run_key,null,x.customer_id,x.reseller_id,null,x.id,jsonb_build_object('detector','merchant_commercial_v2','expected_value_net_huf',x.expected_value_net_huf,'due_at',x.due_at));v_commercial:=v_commercial+1;
 end loop;
 return jsonb_build_object('orders',v_orders,'inventory',v_inventory,'customer',v_customer,'commercial',v_commercial);
end$$;

create or replace function public.resolve_stale_merchant_control_alerts_v2(p_instance_id uuid,p_started_at timestamptz,p_run_key text) returns integer language plpgsql security definer set search_path=public as $$declare r record;v int:=0;begin
 for r in select id,status from public.control_alerts where instance_id=p_instance_id and status in('open','acknowledged','snoozed') and last_detected_at<p_started_at and evidence->>'detector' in('merchant_orders_v2','merchant_inventory_v2','merchant_customer_value_v2','merchant_commercial_v2') loop
  perform public.transition_control_alert_v2(p_instance_id,r.id,'resolved','auto-resolve:'||p_run_key||':'||r.id,null,null,'A tenant-safe detektor a feltételt már nem találta.');v:=v+1;
 end loop;return v;
end$$;

create or replace function public.plan_control_tasks_v2(p_instance_id uuid,p_run_key text) returns jsonb language plpgsql security definer set search_path=public as $$declare a record;v int:=0;begin
 for a in select * from public.control_alerts where instance_id=p_instance_id and status in('open','acknowledged') and severity in('high','critical') loop
  insert into public.control_tasks(instance_id,task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
  values(p_instance_id,p_instance_id::text||':alert:'||a.id::text||':primary',a.id,'open',a.priority_score,'Teendő · '||a.title,a.recommended_action,now()+case when a.severity='critical' then interval '2 hours' else interval '8 hours' end,jsonb_build_object('source','merchant_control_tower_v2','run_key',p_run_key))
  on conflict(instance_id,task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),recommended_action=excluded.recommended_action,due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now();v:=v+1;
 end loop;return jsonb_build_object('tasks_planned',v);
end$$;

create or replace function public.process_control_tower_cycle_v2(p_instance_id uuid,p_run_key text) returns public.control_processing_runs language plpgsql security definer set search_path=public as $$declare run public.control_processing_runs;v_started timestamptz;v_domain jsonb;v_resolved int;v_tasks jsonb;v_key text;begin
 if p_instance_id is null or nullif(trim(p_run_key),'') is null then raise exception 'tenant_and_run_key_required';end if;v_key:=p_instance_id::text||':'||trim(p_run_key);perform pg_advisory_xact_lock(hashtextextended('control-cycle:'||v_key,0));select * into run from public.control_processing_runs where instance_id=p_instance_id and run_key=v_key for update;if found and run.completed_at is not null then return run;end if;if not found then insert into public.control_processing_runs(instance_id,run_key) values(p_instance_id,v_key) returning * into run;end if;v_started:=run.started_at;
 select public.detect_merchant_control_alerts_v2(p_instance_id,v_key) into v_domain;select public.resolve_stale_merchant_control_alerts_v2(p_instance_id,v_started,v_key) into v_resolved;select public.plan_control_tasks_v2(p_instance_id,v_key) into v_tasks;
 update public.control_processing_runs set detector_result=jsonb_build_object('merchant',v_domain,'auto_resolved',v_resolved),task_result=v_tasks,completed_at=now(),metadata=jsonb_build_object('safety','tenant_control_plane_only','system_health_scope','platform_only','sequence',jsonb_build_array('detect_merchant','resolve_stale','plan_human_tasks')) where id=run.id and instance_id=p_instance_id returning * into run;return run;
end$$;

revoke all on function public.upsert_control_alert_v2(uuid,text,text,text,text,integer,text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb),public.detect_merchant_control_alerts_v2(uuid,text),public.resolve_stale_merchant_control_alerts_v2(uuid,timestamptz,text),public.plan_control_tasks_v2(uuid,text),public.process_control_tower_cycle_v2(uuid,text) from public,anon,authenticated;
grant execute on function public.upsert_control_alert_v2(uuid,text,text,text,text,integer,text,text,text,text,uuid,uuid,uuid,uuid,uuid,jsonb),public.detect_merchant_control_alerts_v2(uuid,text),public.resolve_stale_merchant_control_alerts_v2(uuid,timestamptz,text),public.plan_control_tasks_v2(uuid,text),public.process_control_tower_cycle_v2(uuid,text) to service_role;
