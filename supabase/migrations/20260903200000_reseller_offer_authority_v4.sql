-- Fail-closed authority for commercial offers and downstream lifecycle reconciliation.
-- Active offers may advance only while their opportunity is actionable and B2B reseller authority is current.

create or replace function private.enforce_commercial_offer_authority_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_opp public.commercial_opportunities%rowtype;
begin
  -- Closing an offer must remain possible even after authority or opportunity state changed.
  if new.status not in ('draft','approved','sent','accepted') then
    return new;
  end if;

  select * into v_opp
  from public.commercial_opportunities
  where id=new.opportunity_id and instance_id=new.instance_id;

  if not found then
    raise exception 'COMMERCIAL_OPPORTUNITY_TENANT_MISMATCH';
  end if;
  if v_opp.status not in ('open','in_progress') then
    raise exception 'COMMERCIAL_OPPORTUNITY_NOT_ACTIVE';
  end if;
  if not exists(
    select 1 from public.product_variants pv
    where pv.id=new.variant_id and pv.instance_id=new.instance_id
  ) then
    raise exception 'COMMERCIAL_VARIANT_TENANT_MISMATCH';
  end if;

  if v_opp.channel='b2b' then
    if v_opp.reseller_id is null or not exists(
      select 1
      from public.customer_instance_roles cir
      where cir.instance_id=new.instance_id
        and cir.user_id=v_opp.reseller_id
        and cir.role='reseller'
        and cir.reseller_approved=true
    ) then
      raise exception 'B2B_RESELLER_AUTHORITY_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_commercial_offer_authority_v1() from public,anon,authenticated,service_role;

drop trigger if exists commercial_offer_authority_guard on public.commercial_offers;
create trigger commercial_offer_authority_guard
before insert or update of status,opportunity_id,variant_id,instance_id
on public.commercial_offers
for each row execute function private.enforce_commercial_offer_authority_v1();

-- One-time reconciliation for rows created before the guard existed.
-- Closing transitions intentionally bypass the active-authority guard.
update public.commercial_offers f
set status='cancelled',updated_at=now()
where f.status in ('draft','approved','sent')
  and exists(
    select 1
    from public.commercial_opportunities o
    where o.id=f.opportunity_id
      and o.instance_id=f.instance_id
      and (
        o.status not in ('open','in_progress')
        or (
          o.channel='b2b'
          and (
            o.reseller_id is null
            or not exists(
              select 1
              from public.customer_instance_roles cir
              where cir.instance_id=f.instance_id
                and cir.user_id=o.reseller_id
                and cir.role='reseller'
                and cir.reseller_approved=true
            )
          )
        )
      )
  );


create or replace function public.admin_update_customer_store_role_v4(
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
  v_cancelled_offers integer:=0;
  v_org uuid;
  v_audit_id uuid;
begin
  select public.admin_update_customer_store_role_v3(
    p_instance_id,p_user_id,p_actor,p_expected_updated_at,p_patch
  ) into v_result;

  if v_result is null
     or v_result->>'id' is distinct from p_user_id::text
     or v_result->>'role' is null
     or v_result->>'role' not in ('customer','reseller')
     or jsonb_typeof(v_result->'resellerApproved') is distinct from 'boolean'
     or jsonb_typeof(v_result->'retiredOpportunities') is distinct from 'number'
     or jsonb_typeof(v_result->'cancelledTasks') is distinct from 'number' then
    raise exception 'CUSTOMER_ROLE_RESULT_INVALID';
  end if;

  if v_result->>'role'<>'reseller' or (v_result->>'resellerApproved')::boolean is not true then
    update public.commercial_offers f
    set status='cancelled',updated_at=now()
    where f.instance_id=p_instance_id
      and f.status in ('draft','approved','sent')
      and exists(
        select 1
        from public.commercial_opportunities o
        where o.id=f.opportunity_id
          and o.instance_id=p_instance_id
          and o.reseller_id=p_user_id
          and o.channel='b2b'
          and o.kind='reorder'
      );
    get diagnostics v_cancelled_offers=row_count;
  end if;

  if v_cancelled_offers>0 then
    select organization_id into v_org
    from public.webshop_instances where id=p_instance_id;
    if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,
      'customer.store_role_offer_reconciled',
      'customer_instance_role',
      p_user_id::text,
      v_org,
      p_instance_id,
      'Partnerstátuszhoz kötött aktív ajánlatok atomikusan lezárva',
      jsonb_build_object(
        'role',v_result->>'role',
        'resellerApproved',(v_result->>'resellerApproved')::boolean,
        'cancelledOffers',v_cancelled_offers
      ),
      jsonb_build_object(
        'audit_source','database_rpc',
        'authority','customer_instance_roles',
        'parent_rpc','admin_update_customer_store_role_v4'
      )
    ) returning id into v_audit_id;
    if v_audit_id is null then raise exception 'CUSTOMER_ROLE_OFFER_AUDIT_MISSING'; end if;
  end if;

  return v_result||jsonb_build_object('cancelledOffers',v_cancelled_offers);
end;
$$;

revoke all on function public.admin_update_customer_store_role_v3(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated,service_role;
revoke all on function public.admin_update_customer_store_role_v4(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_update_customer_store_role_v4(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;


create or replace function public.admin_transition_commercial_opportunity_v4(
  p_instance_id uuid,
  p_opportunity_id uuid,
  p_actor uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before public.commercial_opportunities%rowtype;
  v_result jsonb;
  v_cancelled_offers integer:=0;
  v_cancelled_tasks integer:=0;
  v_org uuid;
  v_audit_id uuid;
begin
  if p_instance_id is null or p_opportunity_id is null or p_actor is null then
    raise exception 'COMMERCIAL_OPPORTUNITY_IDENTITY_REQUIRED';
  end if;
  if p_status not in ('open','in_progress','won','lost','dismissed') then
    raise exception 'COMMERCIAL_OPPORTUNITY_STATUS_INVALID';
  end if;
  if not public.can_manage_sales(p_instance_id,p_actor) then
    raise exception 'SALES_PERMISSION_REQUIRED';
  end if;

  select * into v_before
  from public.commercial_opportunities
  where id=p_opportunity_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_NOT_FOUND'; end if;

  -- A B2B opportunity cannot be reopened or progressed after reseller authority disappears.
  if p_status in ('open','in_progress') and v_before.channel='b2b' then
    if v_before.reseller_id is null or not exists(
      select 1 from public.customer_instance_roles cir
      where cir.instance_id=p_instance_id
        and cir.user_id=v_before.reseller_id
        and cir.role='reseller'
        and cir.reseller_approved=true
    ) then
      raise exception 'B2B_RESELLER_AUTHORITY_REQUIRED';
    end if;
  end if;

  select public.admin_transition_commercial_opportunity_v3(
    p_instance_id,p_opportunity_id,p_actor,p_status
  ) into v_result;

  if v_result is null
     or v_result->>'id' is distinct from p_opportunity_id::text
     or v_result->>'status' is distinct from p_status then
    raise exception 'COMMERCIAL_OPPORTUNITY_RESULT_INVALID';
  end if;

  if p_status in ('won','lost','dismissed') then
    update public.commercial_offers f
    set status='cancelled',updated_at=now()
    where f.instance_id=p_instance_id
      and f.opportunity_id=p_opportunity_id
      and f.status in ('draft','approved','sent');
    get diagnostics v_cancelled_offers=row_count;

    update public.sales_tasks t
    set
      status='cancelled',
      outcome='Automatikusan lezárva [commercial_planner]: a kereskedelmi lehetőség már nem aktív vagy nem igényel kiemelt kezelést.',
      completed_at=null,
      updated_at=now()
    where t.instance_id=p_instance_id
      and t.opportunity_id=p_opportunity_id
      and t.task_key='opportunity:'||p_opportunity_id::text
      and t.status in ('open','in_progress');
    get diagnostics v_cancelled_tasks=row_count;
  end if;

  if v_cancelled_offers>0 or v_cancelled_tasks>0 then
    select organization_id into v_org
    from public.webshop_instances where id=p_instance_id;
    if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,
      'commercial.opportunity_downstream_reconciled',
      'commercial_opportunity',
      p_opportunity_id::text,
      v_org,
      p_instance_id,
      'Lezárt értékesítési lehetőség aktív ajánlatai és generált feladatai lezárva',
      to_jsonb(v_before),
      jsonb_build_object(
        'status',p_status,
        'cancelledOffers',v_cancelled_offers,
        'cancelledTasks',v_cancelled_tasks
      ),
      jsonb_build_object(
        'audit_source','database_rpc',
        'parent_rpc','admin_transition_commercial_opportunity_v4'
      )
    ) returning id into v_audit_id;
    if v_audit_id is null then raise exception 'COMMERCIAL_DOWNSTREAM_AUDIT_MISSING'; end if;
  end if;

  return v_result||jsonb_build_object(
    'cancelledOffers',v_cancelled_offers,
    'cancelledTasks',v_cancelled_tasks
  );
end;
$$;

revoke all on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
from public,anon,authenticated,service_role;
revoke all on function public.admin_transition_commercial_opportunity_v4(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.admin_transition_commercial_opportunity_v4(uuid,uuid,uuid,text)
to service_role;

comment on function private.enforce_commercial_offer_authority_v1()
is 'Fail-closed trigger guard: active commercial offers require an active tenant opportunity, same-tenant variant and current B2B reseller authority.';
comment on function public.admin_update_customer_store_role_v4(uuid,uuid,uuid,timestamptz,jsonb)
is 'Atomic tenant customer-role mutation plus opportunity/task/active-offer reconciliation with exact evidence.';
comment on function public.admin_transition_commercial_opportunity_v4(uuid,uuid,uuid,text)
is 'Tenant opportunity transition with B2B authority revalidation and atomic active-offer/generated-task closure.';
