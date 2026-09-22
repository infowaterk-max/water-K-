-- V12: impossible-state guards, service/return reconciliation and operations priority.

create or replace function public.guard_order_status_against_operations()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_op text;begin
 if new.status is not distinct from old.status then return new; end if;
 select operational_status into v_op from public.order_operations where order_id=new.id;
 if new.status='cancelled' and v_op in ('handed_over','delivered') then
   raise exception 'A futárnak átadott vagy kézbesített rendelés nem törölhető; használj visszáru/visszatérítés folyamatot.';
 end if;
 if old.status='completed' and new.status not in ('completed','refunded') then
   raise exception 'A teljesített rendelés kereskedelmi állapota nem állítható vissza.';
 end if;
 if old.status='shipped' and new.status in ('draft','pending','paid','processing') then
   raise exception 'A feladott rendelés nem állítható vissza feldolgozási állapotba.';
 end if;
 return new;
end;$$;
revoke all on function public.guard_order_status_against_operations() from public,anon,authenticated;
drop trigger if exists guard_order_status_against_operations_trigger on public.orders;
create trigger guard_order_status_against_operations_trigger before update of status on public.orders for each row execute function public.guard_order_status_against_operations();

create or replace view public.order_service_operations with(security_invoker=true) as
select q.*,
  coalesce(s.open_support_count,0)::integer as open_support_count,
  coalesce(s.urgent_support_count,0)::integer as urgent_support_count,
  coalesce(r.open_return_count,0)::integer as open_return_count,
  coalesce(r.received_return_count,0)::integer as received_return_count,
  case when coalesce(s.open_support_count,0)>0 or coalesce(r.open_return_count,0)>0 then true else false end as service_attention_required
from public.order_operations_queue q
left join lateral(
 select count(*) filter(where st.status in ('open','in_progress','waiting_customer'))::integer as open_support_count,
        count(*) filter(where st.status in ('open','in_progress') and st.priority in ('high','urgent'))::integer as urgent_support_count
 from public.support_tickets st where st.order_id=q.order_id
)s on true
left join lateral(
 select count(*) filter(where rc.status in ('requested','approved','received','refund_pending'))::integer as open_return_count,
        count(*) filter(where rc.status in ('received','refund_pending'))::integer as received_return_count
 from public.return_cases rc where rc.order_id=q.order_id
)r on true;
revoke all on public.order_service_operations from public,anon,authenticated;
grant select on public.order_service_operations to service_role;

create or replace function public.refresh_order_operation_priorities()
returns integer language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;begin
 update public.order_operations op set
   priority_score=least(100,greatest(0,
     40
     +case when op.operational_status='blocked' then 30 else 0 end
     +case when q.age_hours>=48 then 20 when q.age_hours>=24 then 10 else 0 end
     +case when q.customer_value_tier='platinum' then 15 when q.customer_value_tier='gold' then 8 else 0 end
     +case when so.urgent_support_count>0 then 15 when so.open_support_count>0 then 7 else 0 end
     +case when so.open_return_count>0 then 8 else 0 end
   )),updated_at=now(),metadata=op.metadata||jsonb_build_object('priority_refreshed_at',now(),'priority_basis','operations_not_customer_penalty')
 from public.order_operations_queue q
 join public.order_service_operations so on so.order_id=q.order_id
 where q.order_id=op.order_id and op.operational_status not in ('delivered','cancelled');
 get diagnostics v_count=row_count;
 return v_count;
end;$$;
revoke all on function public.refresh_order_operation_priorities() from public,anon,authenticated;
grant execute on function public.refresh_order_operation_priorities() to service_role;

create or replace view public.operations_kpi_summary with(security_invoker=true) as
select
 count(*)::bigint as open_orders,
 count(*) filter(where operational_status='blocked')::bigint as blocked_orders,
 count(*) filter(where operational_status='ready_to_pack')::bigint as ready_to_pack_orders,
 count(*) filter(where operational_status='packed')::bigint as packed_orders,
 count(*) filter(where age_hours>=24)::bigint as over_24h_orders,
 count(*) filter(where service_attention_required)::bigint as service_attention_orders,
 count(*) filter(where customer_value_tier in ('gold','platinum') and operational_status not in ('delivered','cancelled'))::bigint as high_value_open_orders,
 coalesce(avg(age_hours),0)::numeric as avg_open_age_hours
from public.order_service_operations;
revoke all on public.operations_kpi_summary from public,anon,authenticated;
grant select on public.operations_kpi_summary to service_role;
