-- Atomic evidence closure for CMS mutations and manual fulfillment.
-- Business state, operational event and tamper-evident admin audit commit or roll back together.

create or replace function public.admin_mutate_content_page_v2(
  p_instance_id uuid,
  p_content_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.content_pages%rowtype;
  updated_row public.content_pages%rowtype;
  v_org uuid;
  v_status text;
  v_label text;
begin
  if p_instance_id is null or p_actor is null then
    raise exception 'CONTENT_IDENTITY_REQUIRED';
  end if;
  if p_action not in ('create','update','delete') then
    raise exception 'CONTENT_ACTION_INVALID';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'CONTENT_PAYLOAD_INVALID';
  end if;
  if exists(
    select 1 from jsonb_object_keys(p_payload) as k(key)
    where k.key not in (
      'kind','slug','title','excerpt','body','hero_title','hero_subtitle',
      'cta_label','cta_href','seo_title','seo_description','status'
    )
  ) then
    raise exception 'CONTENT_FIELD_NOT_ALLOWED';
  end if;
  if not public.can_manage_marketing(p_instance_id,p_actor) then
    raise exception 'MARKETING_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='create' then
    if p_content_id is not null then raise exception 'CONTENT_CREATE_ID_INVALID'; end if;
    v_status:=coalesce(p_payload->>'status','draft');
    insert into public.content_pages(
      instance_id,kind,slug,title,excerpt,body,hero_title,hero_subtitle,
      cta_label,cta_href,seo_title,seo_description,status,published_at,updated_at
    ) values(
      p_instance_id,
      p_payload->>'kind',
      p_payload->>'slug',
      p_payload->>'title',
      p_payload->>'excerpt',
      coalesce(p_payload->>'body',''),
      p_payload->>'hero_title',
      p_payload->>'hero_subtitle',
      p_payload->>'cta_label',
      p_payload->>'cta_href',
      p_payload->>'seo_title',
      p_payload->>'seo_description',
      v_status,
      case when v_status='published' then now() else null end,
      now()
    )
    returning * into updated_row;

    v_label:=case updated_row.kind when 'blog' then 'Blogbejegyzés' when 'landing' then 'Landing oldal' else 'Információs oldal' end;
    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'content.created','content_page',updated_row.id::text,v_org,p_instance_id,
      v_label||' létrehozva',to_jsonb(updated_row),
      jsonb_build_object('audit_source','database_rpc')
    );
    return jsonb_build_object('id',updated_row.id,'after',to_jsonb(updated_row));
  end if;

  if p_content_id is null then raise exception 'CONTENT_ID_REQUIRED'; end if;
  select * into current_row
  from public.content_pages
  where id=p_content_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'CONTENT_NOT_FOUND'; end if;

  if p_action='update' then
    update public.content_pages
    set
      slug=case when p_payload ? 'slug' then p_payload->>'slug' else current_row.slug end,
      title=case when p_payload ? 'title' then p_payload->>'title' else current_row.title end,
      excerpt=case when p_payload ? 'excerpt' then p_payload->>'excerpt' else current_row.excerpt end,
      body=case when p_payload ? 'body' then coalesce(p_payload->>'body','') else current_row.body end,
      hero_title=case when p_payload ? 'hero_title' then p_payload->>'hero_title' else current_row.hero_title end,
      hero_subtitle=case when p_payload ? 'hero_subtitle' then p_payload->>'hero_subtitle' else current_row.hero_subtitle end,
      cta_label=case when p_payload ? 'cta_label' then p_payload->>'cta_label' else current_row.cta_label end,
      cta_href=case when p_payload ? 'cta_href' then p_payload->>'cta_href' else current_row.cta_href end,
      seo_title=case when p_payload ? 'seo_title' then p_payload->>'seo_title' else current_row.seo_title end,
      seo_description=case when p_payload ? 'seo_description' then p_payload->>'seo_description' else current_row.seo_description end,
      status=case when p_payload ? 'status' then p_payload->>'status' else current_row.status end,
      published_at=case
        when p_payload ? 'status' then case when p_payload->>'status'='published' then coalesce(current_row.published_at,now()) else null end
        else current_row.published_at
      end,
      updated_at=now()
    where id=p_content_id and instance_id=p_instance_id
    returning * into updated_row;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'content.updated','content_page',p_content_id::text,v_org,p_instance_id,
      'Tartalom módosítva',to_jsonb(current_row),to_jsonb(updated_row),
      jsonb_build_object('audit_source','database_rpc','patch',p_payload)
    );
    return jsonb_build_object('id',updated_row.id,'after',to_jsonb(updated_row));
  end if;

  delete from public.content_pages
  where id=p_content_id and instance_id=p_instance_id;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,metadata
  ) values(
    p_actor,'content.deleted','content_page',p_content_id::text,v_org,p_instance_id,
    'Tartalom törölve',to_jsonb(current_row),
    jsonb_build_object('audit_source','database_rpc')
  );
  return jsonb_build_object('id',p_content_id,'before',to_jsonb(current_row));
end;
$$;

revoke all on function public.admin_mutate_content_page_v2(uuid,uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_content_page_v2(uuid,uuid,uuid,text,jsonb)
to service_role;

comment on function public.admin_mutate_content_page_v2(uuid,uuid,uuid,text,jsonb)
is 'Atomic tenant-scoped content create/update/delete plus tamper-evident admin audit.';


create or replace function public.admin_update_manual_fulfillment_v2(
  p_instance_id uuid,
  p_order_id uuid,
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
  current_row public.orders%rowtype;
  updated_row public.orders%rowtype;
  v_org uuid;
  v_fields jsonb;
begin
  if p_instance_id is null or p_order_id is null or p_actor is null then
    raise exception 'MANUAL_FULFILLMENT_IDENTITY_REQUIRED';
  end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then
    raise exception 'MANUAL_FULFILLMENT_PATCH_REQUIRED';
  end if;
  if exists(
    select 1 from jsonb_object_keys(p_patch) as k(key)
    where k.key not in ('trackingNumber','invoiceNumber','invoiceUrl','paymentReference')
  ) then
    raise exception 'MANUAL_FULFILLMENT_FIELD_NOT_ALLOWED';
  end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then
    raise exception 'ORDER_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into current_row
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_expected_updated_at is not null
     and current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_MANUAL_FULFILLMENT';
  end if;

  update public.orders
  set
    tracking_number=case when p_patch ? 'trackingNumber' then nullif(p_patch->>'trackingNumber','') else current_row.tracking_number end,
    invoice_number=case when p_patch ? 'invoiceNumber' then nullif(p_patch->>'invoiceNumber','') else current_row.invoice_number end,
    invoice_url=case when p_patch ? 'invoiceUrl' then nullif(p_patch->>'invoiceUrl','') else current_row.invoice_url end,
    external_payment_id=case when p_patch ? 'paymentReference' then nullif(p_patch->>'paymentReference','') else current_row.external_payment_id end,
    updated_at=now()
  where id=p_order_id and instance_id=p_instance_id
  returning * into updated_row;

  select coalesce(jsonb_agg(key order by key),'[]'::jsonb)
    into v_fields
    from jsonb_object_keys(p_patch) as x(key);

  insert into public.order_events(
    instance_id,order_id,event_type,actor_user_id,metadata
  ) values(
    p_instance_id,p_order_id,'manual_fulfillment_updated',p_actor,
    jsonb_build_object('fields',v_fields,'source','admin_update_manual_fulfillment_v2')
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'order.manual_fulfillment_updated','order',p_order_id::text,v_org,p_instance_id,
    updated_row.order_number||': kézi teljesítési adatok frissítve',
    to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object('audit_source','database_rpc','fields',v_fields)
  );

  return jsonb_build_object(
    'id',p_order_id,
    'before',to_jsonb(current_row),
    'after',to_jsonb(updated_row)
  );
end;
$$;

revoke all on function public.admin_update_manual_fulfillment_v2(uuid,uuid,uuid,timestamptz,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_update_manual_fulfillment_v2(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;

comment on function public.admin_update_manual_fulfillment_v2(uuid,uuid,uuid,timestamptz,jsonb)
is 'Atomic tenant-scoped manual order fulfillment metadata update with order event and admin audit.';
