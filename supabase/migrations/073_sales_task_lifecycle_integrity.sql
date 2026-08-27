-- V10 audit fix: keep generated sales tasks aligned with opportunity lifecycle
create or replace function public.plan_high_value_sales_tasks()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;begin
  update public.sales_tasks t
     set status='cancelled',
         outcome=coalesce(t.outcome,'Automatikusan lezárva: a kereskedelmi lehetőség már nem aktív.'),
         updated_at=now()
   where t.task_key like 'opportunity:%'
     and t.status in ('open','in_progress')
     and exists(select 1 from public.commercial_opportunities o where o.id=t.opportunity_id and o.status not in ('open','in_progress'));

  insert into public.sales_tasks(opportunity_id,task_key,title,description,priority,due_at)
  select o.id,'opportunity:'||o.id::text,
         case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,
         o.reason||coalesce(' · '||o.recommended_action,''),o.priority_score,coalesce(o.due_at,now())
    from public.commercial_opportunities o
   where o.status in ('open','in_progress')
     and (o.priority_score>=80 or o.expected_value_net_huf>=100000)
  on conflict(task_key) do update
     set priority=excluded.priority,due_at=excluded.due_at,description=excluded.description,updated_at=now()
   where public.sales_tasks.status in ('open','in_progress');
  get diagnostics v_count=row_count;
  return v_count;
end;$$;
revoke all on function public.plan_high_value_sales_tasks() from public,anon,authenticated;
grant execute on function public.plan_high_value_sales_tasks() to service_role;
