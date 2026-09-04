-- Close accepted offers, their opportunity and generated sales task as one auditable unit.
-- The existing v3 transition remains the business engine; v4 adds exact downstream evidence.

create or replace function public.admin_transition_commercial_offer_v4(
  p_instance_id uuid,
  p_offer_id uuid,
  p_actor uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_result jsonb;
  v_offer public.commercial_offers%rowtype;
  v_opportunity public.commercial_opportunities%rowtype;
  v_cancelled_tasks integer:=0;
  v_sibling_active integer:=0;
  v_org uuid;
  v_reconciliation_audit_id uuid;
begin
  if p_instance_id is null or p_offer_id is null or p_actor is null then
    raise exception 'COMMERCIAL_OFFER_IDENTITY_REQUIRED';
  end if;
  if p_status not in ('sent','accepted','expired','cancelled') then
    raise exception 'COMMERCIAL_OFFER_STATUS_INVALID';
  end if;

  select public.admin_transition_commercial_offer_v3(
    p_instance_id,p_offer_id,p_actor,p_status
  ) into v_result;

  if v_result is null
     or v_result->>'id' is distinct from p_offer_id::text
     or v_result->>'status' is distinct from p_status
     or v_result->>'auditId' is null
     or jsonb_typeof(v_result->'offer') is distinct from 'object' then
    raise exception 'COMMERCIAL_OFFER_RESULT_INVALID';
  end if;

  select * into v_offer
  from public.commercial_offers
  where id=p_offer_id and instance_id=p_instance_id;
  if not found or v_offer.status<>p_status then
    raise exception 'COMMERCIAL_OFFER_EVIDENCE_MISSING';
  end if;

  select * into v_opportunity
  from public.commercial_opportunities
  where id=v_offer.opportunity_id and instance_id=p_instance_id;
  if not found then raise exception 'COMMERCIAL_OPPORTUNITY_EVIDENCE_MISSING'; end if;

  if p_status='accepted' then
    -- transition_commercial_offer_v2 is required to atomically win the linked opportunity.
    if v_opportunity.status<>'won' or v_opportunity.closed_at is null then
      raise exception 'COMMERCIAL_ACCEPTANCE_OPPORTUNITY_CLOSURE_MISSING';
    end if;

    select count(*)::integer into v_sibling_active
    from public.commercial_offers f
    where f.instance_id=p_instance_id
      and f.opportunity_id=v_offer.opportunity_id
      and f.id<>p_offer_id
      and f.status in ('draft','approved','sent');
    if v_sibling_active<>0 then
      raise exception 'COMMERCIAL_ACCEPTANCE_SIBLING_CLOSURE_MISSING';
    end if;

    update public.sales_tasks t
    set
      status='cancelled',
      outcome='Automatikusan lezárva [commercial_planner]: az értékesítési ajánlat elfogadásával a lehetőség megnyertté vált.',
      completed_at=null,
      updated_at=now()
    where t.instance_id=p_instance_id
      and t.opportunity_id=v_offer.opportunity_id
      and t.task_key='opportunity:'||v_offer.opportunity_id::text
      and t.status in ('open','in_progress');
    get diagnostics v_cancelled_tasks=row_count;

    select organization_id into v_org
    from public.webshop_instances where id=p_instance_id;
    if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,
      'commercial.offer_acceptance_reconciled',
      'commercial_offer',
      p_offer_id::text,
      v_org,
      p_instance_id,
      'Elfogadott ajánlat opportunity- és feladatlezárása atomikusan igazolva',
      jsonb_build_object(
        'offerStatus',v_offer.status,
        'opportunityId',v_offer.opportunity_id,
        'opportunityStatus',v_opportunity.status,
        'cancelledTasks',v_cancelled_tasks,
        'siblingActiveOffers',v_sibling_active
      ),
      jsonb_build_object(
        'audit_source','database_rpc',
        'parent_rpc','admin_transition_commercial_offer_v4',
        'parentAuditId',v_result->>'auditId'
      )
    ) returning id into v_reconciliation_audit_id;

    if v_reconciliation_audit_id is null then
      raise exception 'COMMERCIAL_ACCEPTANCE_AUDIT_MISSING';
    end if;
  end if;

  return v_result||jsonb_build_object(
    'opportunityStatus',v_opportunity.status,
    'cancelledTasks',v_cancelled_tasks,
    'siblingActiveOffers',v_sibling_active,
    'reconciliationAuditId',v_reconciliation_audit_id
  );
end;
$$;

revoke all on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
from public,anon,authenticated,service_role;
revoke all on function public.admin_transition_commercial_offer_v4(uuid,uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.admin_transition_commercial_offer_v4(uuid,uuid,uuid,text)
to service_role;

comment on function public.admin_transition_commercial_offer_v4(uuid,uuid,uuid,text)
is 'Audited tenant offer transition with exact accepted-offer proof: linked opportunity won, sibling active offers closed, generated task reconciled.';
