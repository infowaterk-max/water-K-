-- Fix customer B2B RFQ submission on databases where sales_tasks is unique by (instance_id,task_key).
-- The original v1 function targeted task_key alone, which PostgreSQL correctly rejected because no such unique constraint exists.
create or replace function public.customer_submit_b2b_quote_request_v1(
 p_instance_id uuid,p_actor uuid,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid;v_request public.b2b_quote_requests%rowtype;v_opportunity uuid;v_expected numeric(14,2):=0;v_items jsonb;v_audit uuid;
begin
 v_account:=private.resolve_b2b_quote_account_v1(p_instance_id,p_actor);
 select * into v_request from public.b2b_quote_requests
 where id=p_request_id and instance_id=p_instance_id and account_id=v_account for update;
 if not found then raise exception 'B2B_QUOTE_REQUEST_NOT_FOUND';end if;
 if v_request.status<>'draft' then raise exception 'B2B_QUOTE_REQUEST_NOT_SUBMITTABLE';end if;

 select coalesce(sum(i.quantity*coalesce(pv.reseller_net_price_huf,pv.net_price_huf)),0),
        jsonb_agg(jsonb_build_object('variantId',pv.id,'sku',pv.sku,'label',pv.label,'quantity',i.quantity,'note',i.note) order by pv.sku)
 into v_expected,v_items
 from public.b2b_quote_request_items i join public.product_variants pv on pv.id=i.variant_id and pv.instance_id=i.instance_id
 where i.request_id=p_request_id and i.instance_id=p_instance_id and pv.active=true;
 if v_items is null or jsonb_array_length(v_items)<1 then raise exception 'B2B_QUOTE_ITEMS_REQUIRED';end if;

 insert into public.commercial_opportunities(
  instance_id,opportunity_key,channel,reseller_id,kind,status,priority_score,expected_value_net_huf,
  probability_percent,due_at,reason,recommended_action,source
 ) values(
  p_instance_id,'rfq:'||p_request_id::text,'b2b',p_actor,'manual','open',80,v_expected,50,now()+interval '2 days',
  'B2B ajánlatkérés','Ajánlat elkészítése és kiküldése',
  jsonb_build_object('origin','customer_b2b_rfq','quoteRequestId',p_request_id,'b2bAccountId',v_account,'customerNote',v_request.note,'items',v_items)
 ) returning id into v_opportunity;

 insert into public.sales_tasks(instance_id,opportunity_id,task_key,title,description,status,priority,due_at)
 values(p_instance_id,v_opportunity,'rfq:'||p_request_id::text,'B2B ajánlatkérés feldolgozása','A partner ajánlatkérést küldött a webáruházból.','open',90,now()+interval '2 days')
 on conflict(instance_id,task_key) do nothing;

 update public.b2b_quote_requests set status='submitted',opportunity_id=v_opportunity,submitted_at=now(),updated_at=now()
 where id=p_request_id and instance_id=p_instance_id;

 v_audit:=private.b2b_audit_v1(p_instance_id,p_actor,'b2b.quote_submitted','b2b_quote_request',p_request_id::text,'B2B ajánlatkérés beküldve',jsonb_build_object('status','draft'),jsonb_build_object('status','submitted','opportunityId',v_opportunity,'expectedNetHuf',v_expected),jsonb_build_object('accountId',v_account,'itemCount',jsonb_array_length(v_items)));
 return jsonb_build_object('ok',true,'id',p_request_id,'status','submitted','opportunityId',v_opportunity,'auditId',v_audit);
end$$;
revoke all on function public.customer_submit_b2b_quote_request_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_submit_b2b_quote_request_v1(uuid,uuid,uuid) to service_role;
