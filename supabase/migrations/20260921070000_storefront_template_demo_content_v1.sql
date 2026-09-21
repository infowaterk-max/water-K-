-- Template Route Integrity + Demo Content Foundation v1.
-- Demo content is tenant-scoped, draft-only and provenance tracked.
-- Merchant-authored/adopted content is never overwritten by template refresh/switch.

alter table public.content_pages
  add column if not exists template_demo_namespace text,
  add column if not exists template_demo_key text,
  add column if not exists template_demo_state text,
  add column if not exists template_demo_source_template_key text,
  add column if not exists template_demo_source_template_version integer;

alter table public.content_pages
  drop constraint if exists content_pages_template_demo_state_check;
alter table public.content_pages
  add constraint content_pages_template_demo_state_check
  check (template_demo_state is null or template_demo_state in ('fixture','adopted','retired'));

create unique index if not exists content_pages_template_demo_identity_uidx
  on public.content_pages(instance_id,template_demo_namespace,template_demo_key)
  where template_demo_namespace is not null and template_demo_key is not null;

create or replace function public.adopt_template_demo_content_on_merchant_edit_v1()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.template_demo_state='fixture'
     and coalesce(current_setting('shoporation.template_fixture_write',true),'')<>'on'
     and row(
       new.slug,new.title,new.excerpt,new.body,new.hero_title,new.hero_subtitle,
       new.cta_label,new.cta_href,new.seo_title,new.seo_description
     ) is distinct from row(
       old.slug,old.title,old.excerpt,old.body,old.hero_title,old.hero_subtitle,
       old.cta_label,old.cta_href,old.seo_title,old.seo_description
     )
  then
    new.template_demo_state:='adopted';
  end if;
  return new;
end;
$$;

drop trigger if exists content_pages_template_demo_adopt_trg on public.content_pages;
create trigger content_pages_template_demo_adopt_trg
before update on public.content_pages
for each row execute function public.adopt_template_demo_content_on_merchant_edit_v1();

create or replace function public.save_storefront_template_demo_content_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_template_key text,
  p_template_version integer,
  p_namespace text,
  p_install jsonb,
  p_retire jsonb,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_item jsonb;
  v_payload jsonb;
  v_existing public.content_pages%rowtype;
  v_org uuid;
  v_kind text;
  v_slug text;
  v_title text;
  v_key text;
  v_installed integer:=0;
  v_refreshed integer:=0;
  v_preserved integer:=0;
  v_retired integer:=0;
begin
  if p_instance_id is null or p_actor_user_id is null then raise exception 'TEMPLATE_DEMO_IDENTITY_REQUIRED'; end if;
  if p_template_key is null or p_template_version is null or p_template_version<1 then raise exception 'TEMPLATE_DEMO_TEMPLATE_INVALID'; end if;
  if p_namespace is null or p_namespace !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'TEMPLATE_DEMO_NAMESPACE_INVALID'; end if;
  if p_operation_key is null or p_operation_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,111}$' then raise exception 'TEMPLATE_DEMO_OPERATION_KEY_INVALID'; end if;
  if p_install is null or jsonb_typeof(p_install)<>'array' or jsonb_array_length(p_install)>128 then raise exception 'TEMPLATE_DEMO_INSTALL_INVALID'; end if;
  if p_retire is null or jsonb_typeof(p_retire)<>'array' or jsonb_array_length(p_retire)>128 then raise exception 'TEMPLATE_DEMO_RETIRE_INVALID'; end if;
  if not public.can_manage_storefront(p_instance_id,p_actor_user_id) then raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED'; end if;
  if not public.can_manage_marketing(p_instance_id,p_actor_user_id) then raise exception 'MARKETING_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  perform pg_advisory_xact_lock(hashtextextended('storefront-template-demo:'||p_instance_id::text||':'||p_operation_key,0));
  perform set_config('shoporation.template_fixture_write','on',true);

  for v_item in select value from jsonb_array_elements(p_install) as x(value)
  loop
    if jsonb_typeof(v_item)<>'object' or v_item->>'entityType'<>'content' then continue; end if;
    v_payload:=v_item->'payload';
    if v_payload is null or jsonb_typeof(v_payload)<>'object' then raise exception 'TEMPLATE_DEMO_CONTENT_PAYLOAD_INVALID'; end if;
    v_key:=v_item->>'entityKey';
    v_kind:=coalesce(v_payload->>'kind','page');
    v_slug:=v_payload->>'slug';
    v_title:=v_payload->>'title';
    if v_key is null or v_key !~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$' then raise exception 'TEMPLATE_DEMO_CONTENT_KEY_INVALID'; end if;
    if v_kind not in ('page','landing','blog') then raise exception 'TEMPLATE_DEMO_CONTENT_KIND_INVALID'; end if;
    if v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'TEMPLATE_DEMO_CONTENT_SLUG_INVALID'; end if;
    if v_title is null or length(trim(v_title))<2 then raise exception 'TEMPLATE_DEMO_CONTENT_TITLE_INVALID'; end if;

    select * into v_existing
    from public.content_pages
    where instance_id=p_instance_id
      and template_demo_namespace=p_namespace
      and template_demo_key=v_key
    for update;

    if found then
      if v_existing.template_demo_state='adopted' then
        v_preserved:=v_preserved+1;
        continue;
      end if;
      update public.content_pages set
        kind=v_kind,slug=v_slug,title=v_title,
        excerpt=nullif(v_payload->>'excerpt',''),
        body=coalesce(v_payload->>'body',''),
        hero_title=nullif(v_payload->>'heroTitle',''),
        hero_subtitle=nullif(v_payload->>'heroSubtitle',''),
        cta_label=nullif(v_payload->>'ctaLabel',''),
        cta_href=nullif(v_payload->>'ctaHref',''),
        seo_title=nullif(v_payload->>'seoTitle',''),
        seo_description=nullif(v_payload->>'seoDescription',''),
        status='draft',published_at=null,
        template_demo_state='fixture',
        template_demo_source_template_key=p_template_key,
        template_demo_source_template_version=p_template_version,
        updated_at=now()
      where id=v_existing.id;
      v_refreshed:=v_refreshed+1;
      continue;
    end if;

    -- A merchant-owned page with the same slug wins. Never overwrite it.
    if exists(
      select 1 from public.content_pages
      where instance_id=p_instance_id and slug=v_slug
    ) then
      v_preserved:=v_preserved+1;
      continue;
    end if;

    insert into public.content_pages(
      instance_id,kind,slug,title,excerpt,body,hero_title,hero_subtitle,
      cta_label,cta_href,seo_title,seo_description,status,published_at,
      template_demo_namespace,template_demo_key,template_demo_state,
      template_demo_source_template_key,template_demo_source_template_version,updated_at
    ) values(
      p_instance_id,v_kind,v_slug,v_title,nullif(v_payload->>'excerpt',''),coalesce(v_payload->>'body',''),
      nullif(v_payload->>'heroTitle',''),nullif(v_payload->>'heroSubtitle',''),
      nullif(v_payload->>'ctaLabel',''),nullif(v_payload->>'ctaHref',''),
      nullif(v_payload->>'seoTitle',''),nullif(v_payload->>'seoDescription',''),
      'draft',null,p_namespace,v_key,'fixture',p_template_key,p_template_version,now()
    );
    v_installed:=v_installed+1;
  end loop;

  for v_item in select value from jsonb_array_elements(p_retire) as x(value)
  loop
    if jsonb_typeof(v_item)<>'object' or v_item->>'entityType'<>'content' then continue; end if;
    update public.content_pages set
      template_demo_state='retired',status='draft',published_at=null,updated_at=now()
    where instance_id=p_instance_id
      and template_demo_namespace=v_item->>'namespace'
      and template_demo_key=v_item->>'entityKey'
      and template_demo_state='fixture';
    if found then v_retired:=v_retired+1; end if;
  end loop;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor_user_id,'storefront.template_demo_content_materialized','storefront_template',
    p_template_key||'@'||p_template_version::text,v_org,p_instance_id,
    'Sablon minta tartalmi draftok materializálva',
    jsonb_build_object('installed',v_installed,'refreshed',v_refreshed,'preserved',v_preserved,'retired',v_retired),
    jsonb_build_object('audit_source','database_rpc','operationKey',p_operation_key,'namespace',p_namespace,'mutationScope','template_demo_content_drafts_only')
  );

  return jsonb_build_object(
    'installed',v_installed,'refreshed',v_refreshed,'preserved',v_preserved,'retired',v_retired,
    'mutationScope','template_demo_content_drafts_only'
  );
end;
$$;

revoke all on function public.save_storefront_template_demo_content_v1(uuid,uuid,text,integer,text,jsonb,jsonb,text)
from public,anon,authenticated;
grant execute on function public.save_storefront_template_demo_content_v1(uuid,uuid,text,integer,text,jsonb,jsonb,text)
to service_role;

comment on function public.save_storefront_template_demo_content_v1(uuid,uuid,text,integer,text,jsonb,jsonb,text)
is 'Materializes tenant-scoped template demo content as drafts only; adopted/merchant content is preserved.';
