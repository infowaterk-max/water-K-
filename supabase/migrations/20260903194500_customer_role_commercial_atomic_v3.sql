-- Atomically reconcile tenant customer role changes with commercial work derived from that role.
-- v3 wraps the already-audited role mutation and makes reseller revocation immediately authoritative downstream.

create or replace function public.admin_update_customer_store_role_v3(
  p_instance_id uuid,
  p_user_id uuid,
  p_actor uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_result jsonb;
  v_role text;
  v_approved boolean;
  v_retired_ids uuid[]:='{}'::uuid[];
  v_retired integer:=0;
  v_cancelled integer:=0;
  v_org uuid;
begin
  -- The v2 routine owns validation, permission, row locking, optimistic concurrency and role-change audit.
  select public.admin_update_customer_store_role_v2(
    p_instance_id,
    p_user_id,
    p_actor,
    p_expected_updated_at,
    p_patch
  ) into v_result;

  if v_result is null
     or v_result->>'id' is distinct from p_user_id::text
     or v_result->>'role' not in ('customer','reseller')
     or jsonb_typeof(v_result->'resellerApproved')<>'boolean' then
    raise exception 'CUSTOMER_ROLE_RESULT_INVALID';
  end if;

  v_role:=v_result->>'role';
  v_approved:=(v_result->>'resellerApproved')::boolean;

  -- A revoked/non-reseller tenant role invalidates only the generated reorder opportunity for this webshop.
  if v_role<>'reseller' or not v_approved then
    with retired as (
      update public.commercial_opportunities o
      set
        status='dismissed',
        closed_at=now(),
        updated_at=now(),
        source=coalesce(o.source,'{}'::jsonb)||jsonb_build_object(
          'auto_closed_reason','tenant_reseller_no_longer_actionable',
          'authority','customer_instance_roles',
          'role_reconciliation','admin_update_customer_store_role_v3'
        )
      where o.instance_id=p_instance_id
        and o.reseller_id=p_user_id
        and o.channel='b2b'
        and o.kind='reorder'
        and o.opportunity_key='b2b:'||p_user_id::text||':reorder'
        and o.status in('open','in_progress')
      returning o.id
    )
    select coalesce(array_agg(id),'{}'::uuid[]),count(*)::integer
      into v_retired_ids,v_retired
    from retired;

    if cardinality(v_retired_ids)>0 then
      update public.sales_tasks t
      set
        status='cancelled',
        outcome='Automatikusan lezárva [commercial_planner]: a kereskedelmi lehetőség már nem aktív vagy nem igényel kiemelt kezelést.',
        completed_at=null,
        updated_at=now()
      where t.instance_id=p_instance_id
        and t.opportunity_id=any(v_retired_ids)
        and t.task_key='opportunity:'||t.opportunity_id::text
        and t.status in('open','in_progress');
      get diagnostics v_cancelled=row_count;
    end if;
  end if;

  if v_retired>0 or v_cancelled>0 then
    select organization_id into v_org
    from public.webshop_instances
    where id=p_instance_id;
    if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,
      'customer.store_role_commercial_reconciled',
      'customer_instance_role',
      p_user_id::text,
      v_org,
      p_instance_id,
      'Partnerstátuszhoz kötött kereskedelmi teendők atomikusan újraegyeztetve',
      jsonb_build_object(
        'role',v_role,
        'resellerApproved',v_approved,
        'retiredOpportunities',v_retired,
        'cancelledTasks',v_cancelled
      ),
      jsonb_build_object(
        'audit_source','database_rpc',
        'authority','customer_instance_roles',
        'parent_rpc','admin_update_customer_store_role_v3'
      )
    );
  end if;

  return v_result||jsonb_build_object(
    'retiredOpportunities',v_retired,
    'cancelledTasks',v_cancelled
  );
end;
$$;

-- v2 is now an internal implementation detail. Only the evidence-returning v3 wrapper is callable by app runtime.
revoke all on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated,service_role;
revoke all on function public.admin_update_customer_store_role_v3(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_update_customer_store_role_v3(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;

comment on function public.admin_update_customer_store_role_v3(uuid,uuid,uuid,timestamptz,jsonb)
is 'Atomic tenant customer-role mutation plus immediate commercial opportunity/task reconciliation. Returns exact role and reconciliation evidence.';
