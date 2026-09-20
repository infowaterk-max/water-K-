-- Customer-side B2B RFQ workflow backed by the existing commercial opportunity/offer engine.
-- Draft ownership is account-scoped; submit/accept are atomic and audited.
create table if not exists public.b2b_quote_requests(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  account_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','submitted','accepted','cancelled')),
  note text,
  opportunity_id uuid references public.commercial_opportunities(id) on delete restrict,
  submitted_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,instance_id),
  unique(opportunity_id),
  foreign key(account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete restrict,
  check(note is null or char_length(note)<=4000),
  check((status='draft' and submitted_at is null) or status<>'draft')
);
create index if not exists b2b_quote_requests_account_idx on public.b2b_quote_requests(instance_id,account_id,created_at desc);
create index if not exists b2b_quote_requests_actor_idx on public.b2b_quote_requests(instance_id,requested_by,created_at desc);

create table if not exists public.b2b_quote_request_items(
  request_id uuid not null,
  instance_id uuid not null,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check(quantity between 1 and 100000),
  note text,
  created_at timestamptz not null default now(),
  primary key(request_id,variant_id),
  foreign key(request_id,instance_id) references public.b2b_quote_requests(id,instance_id) on delete cascade,
  check(note is null or char_length(note)<=1000)
);
create index if not exists b2b_quote_request_items_variant_idx on public.b2b_quote_request_items(instance_id,variant_id);

alter table public.b2b_quote_requests enable row level security;
alter table public.b2b_quote_request_items enable row level security;
revoke all on table public.b2b_quote_requests from public,anon,authenticated;
revoke all on table public.b2b_quote_request_items from public,anon,authenticated;
grant select,insert,update,delete on table public.b2b_quote_requests to service_role;
grant select,insert,update,delete on table public.b2b_quote_request_items to service_role;

create or replace function private.resolve_b2b_quote_account_v1(p_instance_id uuid,p_actor uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_account uuid;
begin
 if p_instance_id is null or p_actor is null then raise exception 'B2B_QUOTE_IDENTITY_REQUIRED';end if;
 if not private.has_b2b_purchase_authority_v1(p_instance_id,p_actor) then raise exception 'B2B_QUOTE_AUTHORITY_REQUIRED';end if;
 select r.b2b_account_id into v_account from public.customer_instance_roles r
 where r.instance_id=p_instance_id and r.user_id=p_actor and r.role='reseller' and r.reseller_approved=true and r.b2b_account_id is not null;
 if v_account is null then raise exception 'B2B_QUOTE_ACCOUNT_REQUIRED';end if;
 return v_account;
end$$;
revoke all on function private.resolve_b2b_quote_account_v1(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.customer_save_b2b_quote_request_v1(
 p_instance_id uuid,p_actor uuid,p_request_id uuid,p_note text,p_items jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid;v_request public.b2b_quote_requests%rowtype;v_item jsonb;v_variant uuid;v_quantity integer;v_item_note text;v_audit uuid;v_count integer:=0;
begin
 v_account:=private.resolve_b2b_quote_account_v1(p_instance_id,p_actor);
 if p_note is not null and char_length(p_note)>4000 then raise exception 'B2B_QUOTE_NOTE_INVALID';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'B2B_QUOTE_ITEMS_INVALID';end if;

 if p_request_id is null then
  insert into public.b2b_quote_requests(instance_id,account_id,requested_by,note)
  values(p_instance_id,v_account,p_actor,nullif(trim(p_note),''))
  returning * into v_request;
 else
  select * into v_request from public.b2b_quote_requests
  where id=p_request_id and instance_id=p_instance_id and account_id=v_account for update;
  if not found then raise exception 'B2B_QUOTE_REQUEST_NOT_FOUND';end if;
  if v_request.status<>'draft' then raise exception 'B2B_QUOTE_REQUEST_NOT_EDITABLE';end if;
  update public.b2b_quote_requests set note=nullif(trim(p_note),''),updated_at=now()
  where id=v_request.id and instance_id=p_instance_id returning * into v_request;
  delete from public.b2b_quote_request_items where request_id=v_request.id and instance_id=p_instance_id;
 end if;

 for v_item in select value from jsonb_array_elements(p_items) loop
  v_variant:=(v_item->>'variantId')::uuid;
  v_quantity:=(v_item->>'quantity')::integer;
  v_item_note:=nullif(trim(v_item->>'note'),'');
  if v_quantity is null or v_quantity<1 or v_quantity>100000 or (v_item_note is not null and char_length(v_item_note)>1000) then raise exception 'B2B_QUOTE_ITEM_INVALID';end if;
  perform 1 from public.product_variants pv where pv.id=v_variant and pv.instance_id=p_instance_id and pv.active=true;
  if not found then raise exception 'B2B_QUOTE_VARIANT_INVALID';end if;
  insert into public.b2b_quote_request_items(request_id,instance_id,variant_id,quantity,note)
  values(v_request.id,p_instance_id,v_variant,v_quantity,v_item_note)
  on conflict(request_id,variant_id) do update set quantity=excluded.quantity,note=excluded.note;
  v_count:=v_count+1;
 end loop;
 if v_count<1 then raise exception 'B2B_QUOTE_ITEMS_INVALID';end if;

 v_audit:=private.b2b_audit_v1(p_instance_id,p_actor,'b2b.quote_draft_saved','b2b_quote_request',v_request.id::text,'B2B ajánlatkérés piszkozat mentve',null,jsonb_build_object('status','draft','itemCount',v_count),jsonb_build_object('accountId',v_account));
 return jsonb_build_object('ok',true,'id',v_request.id,'status','draft','itemCount',v_count,'auditId',v_audit);
end$$;
revoke all on function public.customer_save_b2b_quote_request_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.customer_save_b2b_quote_request_v1(uuid,uuid,uuid,text,jsonb) to service_role;

create or replace function public.customer_submit_b2b_quote_request_v1(
 p_instance_id uuid,p_actor uuid,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid;v_request public.b2b_quote_requests%rowtype;v_opportunity uuid;v_expected numeric(14,2):=0;v_items jsonb;v_audit uuid;v_org uuid;
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
 on conflict(task_key) do nothing;

 update public.b2b_quote_requests set status='submitted',opportunity_id=v_opportunity,submitted_at=now(),updated_at=now()
 where id=p_request_id and instance_id=p_instance_id;

 v_audit:=private.b2b_audit_v1(p_instance_id,p_actor,'b2b.quote_submitted','b2b_quote_request',p_request_id::text,'B2B ajánlatkérés beküldve',jsonb_build_object('status','draft'),jsonb_build_object('status','submitted','opportunityId',v_opportunity,'expectedNetHuf',v_expected),jsonb_build_object('accountId',v_account,'itemCount',jsonb_array_length(v_items)));
 return jsonb_build_object('ok',true,'id',p_request_id,'status','submitted','opportunityId',v_opportunity,'auditId',v_audit);
end$$;
revoke all on function public.customer_submit_b2b_quote_request_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_submit_b2b_quote_request_v1(uuid,uuid,uuid) to service_role;

create or replace function public.customer_accept_b2b_quote_offer_v1(
 p_instance_id uuid,p_actor uuid,p_request_id uuid,p_offer_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account uuid;v_request public.b2b_quote_requests%rowtype;v_offer public.commercial_offers%rowtype;v_after public.commercial_offers%rowtype;v_audit uuid;v_tasks integer:=0;
begin
 v_account:=private.resolve_b2b_quote_account_v1(p_instance_id,p_actor);
 select * into v_request from public.b2b_quote_requests
 where id=p_request_id and instance_id=p_instance_id and account_id=v_account for update;
 if not found or v_request.opportunity_id is null then raise exception 'B2B_QUOTE_REQUEST_NOT_FOUND';end if;
 if v_request.status not in('submitted') then raise exception 'B2B_QUOTE_REQUEST_NOT_ACCEPTABLE';end if;

 select * into v_offer from public.commercial_offers
 where id=p_offer_id and instance_id=p_instance_id and opportunity_id=v_request.opportunity_id for update;
 if not found then raise exception 'B2B_QUOTE_OFFER_NOT_FOUND';end if;
 if v_offer.status<>'sent' then raise exception 'B2B_QUOTE_OFFER_NOT_ACCEPTABLE';end if;

 select * into v_after from public.transition_commercial_offer_v2(p_instance_id,p_offer_id,'accepted');
 if v_after.id is null or v_after.status<>'accepted' then raise exception 'B2B_QUOTE_ACCEPTANCE_EVIDENCE_MISSING';end if;
 update public.sales_tasks set status='cancelled',outcome='Az ajánlatot a B2B partner elfogadta.',updated_at=now()
 where instance_id=p_instance_id and opportunity_id=v_request.opportunity_id and status in('open','in_progress');
 get diagnostics v_tasks=row_count;
 update public.b2b_quote_requests set status='accepted',accepted_at=now(),updated_at=now()
 where id=p_request_id and instance_id=p_instance_id;

 v_audit:=private.b2b_audit_v1(p_instance_id,p_actor,'b2b.quote_offer_accepted','commercial_offer',p_offer_id::text,'B2B partner elfogadta az ajánlatot',to_jsonb(v_offer),to_jsonb(v_after),jsonb_build_object('quoteRequestId',p_request_id,'accountId',v_account,'cancelledTasks',v_tasks));
 return jsonb_build_object('ok',true,'requestId',p_request_id,'offerId',p_offer_id,'status','accepted','cancelledTasks',v_tasks,'auditId',v_audit);
end$$;
revoke all on function public.customer_accept_b2b_quote_offer_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_accept_b2b_quote_offer_v1(uuid,uuid,uuid,uuid) to service_role;

comment on table public.b2b_quote_requests is 'Customer-owned B2B RFQ drafts/submissions; commercial offers remain authoritative for merchant response.';
comment on function public.customer_submit_b2b_quote_request_v1(uuid,uuid,uuid) is 'Atomically converts an approved B2B customer RFQ draft into the existing tenant commercial opportunity/task pipeline.';
comment on function public.customer_accept_b2b_quote_offer_v1(uuid,uuid,uuid,uuid) is 'Customer-authorized acceptance of a sent offer for the caller B2B account while reusing the canonical commercial transition engine.';
