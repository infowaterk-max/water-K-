-- Tenant propagation for merchant-intelligence child rows.
create or replace function public.mi_fill_child_tenant() returns trigger language plpgsql security definer set search_path=public as $$
declare v uuid;
begin
 if tg_table_name='control_alert_events' then select instance_id into v from public.control_alerts where id=new.alert_id;
 elsif tg_table_name='control_tasks' then select instance_id into v from public.control_alerts where id=new.alert_id;
 elsif tg_table_name='action_proposals' then select instance_id into v from public.control_alerts where id=new.alert_id;
 elsif tg_table_name in('action_proposal_events','action_approvals','action_executions') then select instance_id into v from public.action_proposals where id=new.proposal_id;
 elsif tg_table_name='automation_runbook_instances' then select instance_id into v from public.control_alerts where id=new.alert_id;
 elsif tg_table_name='automation_step_runs' then select instance_id into v from public.automation_runbook_instances where id=new.instance_id;
 elsif tg_table_name='automation_events' then select instance_id into v from public.automation_runbook_instances where id=new.instance_id;
 elsif tg_table_name='customer_journey_steps' then select instance_id into v from public.customer_journeys where id=new.journey_id;
 end if;
 if v is null then raise exception 'tenant_parent_not_found'; end if;
 if tg_table_name in('automation_step_runs','automation_events') then
   if new.store_instance_id is not null and new.store_instance_id<>v then raise exception 'tenant_mismatch'; end if;
   new.store_instance_id:=v;
 else
   if new.instance_id is not null and new.instance_id<>v then raise exception 'tenant_mismatch'; end if;
   new.instance_id:=v;
 end if;
 return new;
end$$;

create or replace function public.mi_fill_alert_tenant_context() returns trigger language plpgsql security definer set search_path=public as $$
declare raw text;v uuid;
begin
 raw:=current_setting('shoperation.instance_id',true);
 if raw is null or raw='' then if new.instance_id is null then raise exception 'merchant_intelligence_tenant_context_required'; end if; return new; end if;
 v:=raw::uuid;if new.instance_id is not null and new.instance_id<>v then raise exception 'tenant_mismatch';end if;new.instance_id:=v;return new;
end$$;

do $$declare t text;begin
 foreach t in array array['control_alert_events','control_tasks','action_proposals','action_proposal_events','action_approvals','action_executions','automation_runbook_instances','automation_step_runs','automation_events','customer_journey_steps'] loop
  execute format('drop trigger if exists mi_fill_child_tenant on public.%I',t);
  execute format('create trigger mi_fill_child_tenant before insert or update on public.%I for each row execute function public.mi_fill_child_tenant()',t);
 end loop;
end$$;
drop trigger if exists mi_fill_alert_tenant_context on public.control_alerts;
create trigger mi_fill_alert_tenant_context before insert or update on public.control_alerts for each row execute function public.mi_fill_alert_tenant_context();
