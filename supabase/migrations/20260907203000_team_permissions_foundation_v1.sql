-- Team + Permissions 2.0 foundation.
-- Extends role_bindings instead of introducing a parallel RBAC model.
-- Fine-grained capabilities are additive and fail closed; existing coarse StorePermission checks remain authoritative
-- until individual application areas are migrated to the new evaluator.

create table if not exists public.store_permission_catalog (
  permission_code text primary key,
  area_code text not null,
  label text not null,
  description text not null default '',
  sensitivity text not null default 'standard' check (sensitivity in ('standard','sensitive','critical')),
  delegable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_role_permission_presets (
  role_code text not null check (role_code in ('owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer')),
  permission_code text not null references public.store_permission_catalog(permission_code) on delete cascade,
  default_scope text not null default 'all' check (default_scope in ('all','own','assigned','own_or_assigned')),
  created_at timestamptz not null default now(),
  primary key(role_code,permission_code)
);

create unique index if not exists webshop_instances_id_org_unique
  on public.webshop_instances(id,organization_id);

create table if not exists public.store_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  instance_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_binding_id uuid not null references public.role_bindings(id) on delete cascade,
  permission_code text not null references public.store_permission_catalog(permission_code) on delete restrict,
  effect text not null check (effect in ('allow','deny')),
  scope_type text not null default 'all' check (scope_type in ('all','own','assigned','own_or_assigned','topic','mailbox')),
  scope_value text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  granted_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(instance_id,organization_id) references public.webshop_instances(id,organization_id) on delete cascade,
  check (valid_until is null or valid_until>valid_from),
  check (
    (scope_type in ('topic','mailbox') and nullif(trim(coalesce(scope_value,'')),'') is not null)
    or (scope_type not in ('topic','mailbox') and scope_value is null)
  )
);
create index if not exists store_permission_overrides_lookup_idx
  on public.store_permission_overrides(instance_id,user_id,permission_code,valid_from,valid_until)
  where revoked_at is null;
create unique index if not exists store_permission_overrides_active_unique
  on public.store_permission_overrides(instance_id,user_id,permission_code,effect,scope_type,coalesce(scope_value,''))
  where revoked_at is null;

create table if not exists public.store_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  instance_id uuid not null,
  source_user_id uuid not null references auth.users(id) on delete cascade,
  delegate_user_id uuid not null references auth.users(id) on delete cascade,
  source_role_binding_id uuid not null references public.role_bindings(id) on delete cascade,
  delegate_role_binding_id uuid not null references public.role_bindings(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  reason text,
  delegated_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(instance_id,organization_id) references public.webshop_instances(id,organization_id) on delete cascade,
  check (source_user_id<>delegate_user_id),
  check (valid_until>valid_from),
  check (reason is null or char_length(reason)<=500)
);
create index if not exists store_delegations_delegate_lookup_idx
  on public.store_delegations(instance_id,delegate_user_id,valid_from,valid_until)
  where revoked_at is null;
create index if not exists store_delegations_source_lookup_idx
  on public.store_delegations(instance_id,source_user_id,valid_from,valid_until)
  where revoked_at is null;

create table if not exists public.store_delegation_permissions (
  delegation_id uuid not null references public.store_delegations(id) on delete cascade,
  permission_code text not null references public.store_permission_catalog(permission_code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(delegation_id,permission_code)
);

alter table public.store_permission_catalog enable row level security;
alter table public.store_role_permission_presets enable row level security;
alter table public.store_permission_overrides enable row level security;
alter table public.store_delegations enable row level security;
alter table public.store_delegation_permissions enable row level security;

-- These authorization tables are server-authoritative. They are intentionally unavailable to browser roles.
revoke all on table public.store_permission_catalog from anon,authenticated;
revoke all on table public.store_role_permission_presets from anon,authenticated;
revoke all on table public.store_permission_overrides from anon,authenticated;
revoke all on table public.store_delegations from anon,authenticated;
revoke all on table public.store_delegation_permissions from anon,authenticated;
grant select,insert,update,delete on table public.store_permission_catalog to service_role;
grant select,insert,update,delete on table public.store_role_permission_presets to service_role;
grant select,insert,update,delete on table public.store_permission_overrides to service_role;
grant select,insert,update,delete on table public.store_delegations to service_role;
grant select,insert,update,delete on table public.store_delegation_permissions to service_role;

insert into public.store_permission_catalog(permission_code,area_code,label,description,sensitivity,delegable) values
  ('team.members.view','team','Csapattagok megtekintése','A webshop csapattagjainak és alap-hozzáféréseinek megtekintése.','sensitive',false),
  ('team.members.manage','team','Csapattagok kezelése','Csapattag hozzáadása, szerepkörének és hozzáférési idejének módosítása.','critical',false),
  ('team.permissions.manage','team','Egyedi jogosultságok kezelése','Személyes capability-k, tiltások és helyettesítések kezelése.','critical',false),
  ('customers.view','customers','Ügyfelek megtekintése','Ügyfélrekordok üzleti célú megtekintése.','sensitive',true),
  ('customers.contact.view','customers','Kapcsolati adatok megtekintése','Ügyfél e-mail, telefonszám és kapcsolattartási adatok megtekintése.','sensitive',true),
  ('orders.view','orders','Rendelések megtekintése','Rendelések és rendelési állapot megtekintése.','standard',true),
  ('orders.edit','orders','Rendelés módosítása','Rendelési adatok módosítása a külön védett pénzügyi műveletek nélkül.','sensitive',true),
  ('orders.status.edit','orders','Rendelési státusz módosítása','Rendelési életciklus státuszának módosítása.','sensitive',true),
  ('orders.internal_note','orders','Rendelési belső jegyzet','Belső rendelési jegyzet létrehozása.','standard',true),
  ('returns.view','returns','Visszaküldések megtekintése','Visszaküldési ügyek megtekintése.','standard',true),
  ('returns.manage','returns','Visszaküldések kezelése','Visszaküldési ügy státuszának és operatív adatainak kezelése.','sensitive',true),
  ('refunds.view','refunds','Visszatérítés megtekintése','Refund állapot és összeg megtekintése.','sensitive',true),
  ('refunds.initiate','refunds','Visszatérítés kezdeményezése','Refund folyamat kezdeményezése, külön jóváhagyási jog nélkül.','critical',true),
  ('refunds.approve','refunds','Visszatérítés jóváhagyása','Pénzügyi visszatérítés végleges jóváhagyása.','critical',false),
  ('quotes.view','quotes','Árajánlatok megtekintése','Árajánlatok és kapcsolódó ügyfélkontextus megtekintése.','standard',true),
  ('quotes.create','quotes','Árajánlat létrehozása','Új árajánlat készítése.','standard',true),
  ('quotes.edit','quotes','Árajánlat módosítása','Meglévő árajánlat szerkesztése.','standard',true),
  ('quotes.send','quotes','Árajánlat elküldése','Árajánlat kiküldése az ügyfélnek.','sensitive',true),
  ('quotes.approve','quotes','Árajánlat jóváhagyása','Kiemelt vagy korlátozott ajánlat végleges jóváhagyása.','critical',false),
  ('office.thread.read','office','Digitális Iroda ügy megtekintése','Saját vagy scope szerint engedélyezett ügyfélbeszélgetések olvasása.','sensitive',true),
  ('office.thread.reply','office','Válasz az ügyfélnek','Engedélyezett Digitális Iroda ügyben válasz küldése.','sensitive',true),
  ('office.internal_chat','office','Belső chat használata','Belső üzleti chat használata; privát chat tartalmát csak résztvevő láthatja.','sensitive',true),
  ('office.shared_inbox','office','Megosztott Inbox elérése','Kifejezetten megosztott postafiók vagy queue elérése.','sensitive',true),
  ('office.takeover','office','Ügy átvétele','Más munkatárshoz tartozó, explicit módon átadható ügy átvétele.','sensitive',true),
  ('office.mailbox.manage','office','Postafiókok kezelése','Csatlakoztatott postafiókok és hozzáférések kezelése.','critical',false),
  ('catalog.view','catalog','Katalógus megtekintése','Termék- és készletadatok megtekintése.','standard',true),
  ('catalog.manage','catalog','Katalógus kezelése','Termék-, variáns-, készlet- és beszerzési adatok kezelése.','sensitive',true),
  ('marketing.view','marketing','Marketing megtekintése','Kampány- és marketingadatok megtekintése.','standard',true),
  ('marketing.manage','marketing','Marketing kezelése','Kampányok és marketingműveletek kezelése.','sensitive',true),
  ('analytics.view','analytics','Elemzések megtekintése','Webshop elemzések és riportok megtekintése.','standard',true),
  ('settings.manage','settings','Webshop beállítások kezelése','Kritikus webshop-beállítások módosítása.','critical',false)
on conflict(permission_code) do update set
  area_code=excluded.area_code,
  label=excluded.label,
  description=excluded.description,
  sensitivity=excluded.sensitivity,
  delegable=excluded.delegable,
  updated_at=now();

-- Owner/admin stay broad presets, but private internal chat contents are never represented by a capability:
-- message visibility will be participant-based in the Digital Office schema.
insert into public.store_role_permission_presets(role_code,permission_code,default_scope)
select role_code,c.permission_code,'all'
from (values('owner'),('admin')) as roles(role_code)
cross join public.store_permission_catalog c
on conflict(role_code,permission_code) do update set default_scope=excluded.default_scope;

insert into public.store_role_permission_presets(role_code,permission_code,default_scope) values
  ('catalog_manager','catalog.view','all'),
  ('catalog_manager','catalog.manage','all'),
  ('catalog_manager','analytics.view','all'),
  ('order_manager','customers.view','all'),
  ('order_manager','customers.contact.view','all'),
  ('order_manager','orders.view','all'),
  ('order_manager','orders.edit','all'),
  ('order_manager','orders.status.edit','all'),
  ('order_manager','orders.internal_note','all'),
  ('order_manager','returns.view','all'),
  ('order_manager','returns.manage','all'),
  ('order_manager','refunds.view','all'),
  ('order_manager','refunds.initiate','all'),
  ('order_manager','office.thread.read','own_or_assigned'),
  ('order_manager','office.thread.reply','own_or_assigned'),
  ('order_manager','office.internal_chat','all'),
  ('order_manager','office.takeover','assigned'),
  ('marketing_manager','marketing.view','all'),
  ('marketing_manager','marketing.manage','all'),
  ('marketing_manager','analytics.view','all'),
  ('support','customers.view','own_or_assigned'),
  ('support','customers.contact.view','own_or_assigned'),
  ('support','orders.view','own_or_assigned'),
  ('support','returns.view','own_or_assigned'),
  ('support','refunds.view','own_or_assigned'),
  ('support','office.thread.read','own_or_assigned'),
  ('support','office.thread.reply','own_or_assigned'),
  ('support','office.internal_chat','all'),
  ('support','office.takeover','assigned'),
  ('analyst','analytics.view','all'),
  ('viewer','catalog.view','all')
on conflict(role_code,permission_code) do update set default_scope=excluded.default_scope;

create or replace function private.store_permission_admin_v1(
  p_instance_id uuid,
  p_actor_user_id uuid
) returns boolean
language sql
stable
set search_path=''
as $$
  select
    exists(
      select 1 from public.platform_operators po
      where po.user_id=p_actor_user_id and po.role in ('owner','admin','operator')
    )
    or exists(
      select 1
      from public.webshop_instances w
      join public.role_bindings rb on rb.organization_id=w.organization_id
      where w.id=p_instance_id
        and rb.user_id=p_actor_user_id
        and rb.role_code='owner'
        and (rb.instance_id=p_instance_id or rb.instance_id is null)
        and rb.revoked_at is null
        and rb.valid_from<=now()
        and (rb.valid_until is null or rb.valid_until>now())
    );
$$;

create or replace function private.store_scope_matches_v1(
  p_scope_type text,
  p_scope_value text,
  p_user_id uuid,
  p_resource_owner_user_id uuid,
  p_resource_assigned_user_id uuid,
  p_topic_code text,
  p_mailbox_key text
) returns boolean
language sql
immutable
set search_path=''
as $$
  select case p_scope_type
    when 'all' then true
    when 'own' then p_resource_owner_user_id is not null and p_resource_owner_user_id=p_user_id
    when 'assigned' then p_resource_assigned_user_id is not null and p_resource_assigned_user_id=p_user_id
    when 'own_or_assigned' then
      (p_resource_owner_user_id is not null and p_resource_owner_user_id=p_user_id)
      or (p_resource_assigned_user_id is not null and p_resource_assigned_user_id=p_user_id)
    when 'topic' then p_topic_code is not null and p_scope_value=p_topic_code
    when 'mailbox' then p_mailbox_key is not null and p_scope_value=p_mailbox_key
    else false
  end;
$$;

create or replace function public.evaluate_store_capability_v1(
  p_instance_id uuid,
  p_user_id uuid,
  p_permission_code text,
  p_resource_owner_user_id uuid default null,
  p_resource_assigned_user_id uuid default null,
  p_topic_code text default null,
  p_mailbox_key text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_roles text[]:=array[]::text[];
  v_has_membership boolean:=false;
  v_denied boolean:=false;
  v_override_allowed boolean:=false;
  v_delegated boolean:=false;
  v_role_allowed boolean:=false;
begin
  if p_instance_id is null or p_user_id is null or nullif(trim(coalesce(p_permission_code,'')),'') is null then
    return jsonb_build_object('allowed',false,'source','invalid_request');
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then return jsonb_build_object('allowed',false,'source','instance_not_found'); end if;

  if exists(select 1 from public.platform_operators po where po.user_id=p_user_id) then
    return jsonb_build_object('allowed',true,'source','platform','roleCodes',jsonb_build_array('platform'));
  end if;

  select coalesce(array_agg(distinct rb.role_code),array[]::text[]),count(*)>0
  into v_roles,v_has_membership
  from public.role_bindings rb
  where rb.organization_id=v_org
    and rb.user_id=p_user_id
    and (rb.instance_id=p_instance_id or rb.instance_id is null)
    and rb.revoked_at is null
    and rb.valid_from<=now()
    and (rb.valid_until is null or rb.valid_until>now());

  if not v_has_membership then
    return jsonb_build_object('allowed',false,'source','no_active_role','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_permission_overrides o
    join public.role_bindings rb on rb.id=o.role_binding_id
    where o.instance_id=p_instance_id and o.user_id=p_user_id and o.permission_code=p_permission_code
      and o.effect='deny' and o.revoked_at is null and o.valid_from<=now() and (o.valid_until is null or o.valid_until>now())
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(o.scope_type,o.scope_value,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_denied;
  if v_denied then
    return jsonb_build_object('allowed',false,'source','explicit_deny','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_permission_overrides o
    join public.role_bindings rb on rb.id=o.role_binding_id
    where o.instance_id=p_instance_id and o.user_id=p_user_id and o.permission_code=p_permission_code
      and o.effect='allow' and o.revoked_at is null and o.valid_from<=now() and (o.valid_until is null or o.valid_until>now())
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(o.scope_type,o.scope_value,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_override_allowed;
  if v_override_allowed then
    return jsonb_build_object('allowed',true,'source','override','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_delegations d
    join public.store_delegation_permissions dp on dp.delegation_id=d.id and dp.permission_code=p_permission_code
    join public.role_bindings source_rb on source_rb.id=d.source_role_binding_id
    join public.role_bindings delegate_rb on delegate_rb.id=d.delegate_role_binding_id
    where d.instance_id=p_instance_id and d.delegate_user_id=p_user_id
      and d.revoked_at is null and d.valid_from<=now() and d.valid_until>now()
      and source_rb.revoked_at is null and source_rb.valid_from<=now() and (source_rb.valid_until is null or source_rb.valid_until>now())
      and delegate_rb.revoked_at is null and delegate_rb.valid_from<=now() and (delegate_rb.valid_until is null or delegate_rb.valid_until>now())
      and p_resource_owner_user_id is not null and p_resource_owner_user_id=d.source_user_id
  ) into v_delegated;
  if v_delegated then
    return jsonb_build_object('allowed',true,'source','delegation','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.role_bindings rb
    join public.store_role_permission_presets rp on rp.role_code=rb.role_code and rp.permission_code=p_permission_code
    where rb.organization_id=v_org and rb.user_id=p_user_id
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(rp.default_scope,null,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_role_allowed;

  return jsonb_build_object(
    'allowed',v_role_allowed,
    'source',case when v_role_allowed then 'role' else 'none' end,
    'roleCodes',to_jsonb(v_roles)
  );
end;
$$;

create or replace function public.merchant_replace_permission_overrides_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_entries jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_binding public.role_bindings%rowtype;
  v_entry jsonb;
  v_permission text;
  v_effect text;
  v_scope text;
  v_scope_value text;
  v_valid_until timestamptz;
  v_before jsonb;
  v_count int:=0;
begin
  if p_instance_id is null or p_actor_user_id is null or p_target_user_id is null then
    raise exception 'STORE_PERMISSION_IDENTITY_REQUIRED';
  end if;
  if not private.store_permission_admin_v1(p_instance_id,p_actor_user_id) then
    raise exception 'STORE_PERMISSION_OWNER_REQUIRED';
  end if;
  if p_actor_user_id=p_target_user_id then raise exception 'SELF_PERMISSION_MUTATION_FORBIDDEN'; end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>100 then
    raise exception 'STORE_PERMISSION_ENTRIES_INVALID';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select rb.* into v_binding
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_target_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by rb.created_at desc limit 1;
  if v_binding.id is null then raise exception 'STORE_PERMISSION_TARGET_BINDING_REQUIRED'; end if;
  if v_binding.role_code='owner' then raise exception 'STORE_PERMISSION_TARGET_OWNER_FORBIDDEN'; end if;

  perform pg_advisory_xact_lock(hashtextextended('store-permissions:'||p_instance_id::text||':'||p_target_user_id::text,0));

  select coalesce(jsonb_agg(jsonb_build_object(
    'permissionCode',o.permission_code,'effect',o.effect,'scopeType',o.scope_type,'scopeValue',o.scope_value,'validUntil',o.valid_until
  ) order by o.permission_code,o.effect,o.scope_type),'[]'::jsonb)
  into v_before
  from public.store_permission_overrides o
  where o.instance_id=p_instance_id and o.user_id=p_target_user_id and o.revoked_at is null;

  update public.store_permission_overrides set revoked_at=now(),updated_at=now()
  where instance_id=p_instance_id and user_id=p_target_user_id and revoked_at is null;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    v_permission:=nullif(trim(coalesce(v_entry->>'permissionCode','')),'');
    v_effect:=nullif(trim(coalesce(v_entry->>'effect','')),'');
    v_scope:=coalesce(nullif(trim(coalesce(v_entry->>'scopeType','')),''),'all');
    v_scope_value:=nullif(trim(coalesce(v_entry->>'scopeValue','')),'');
    v_valid_until:=case when nullif(trim(coalesce(v_entry->>'validUntil','')),'') is null then null else (v_entry->>'validUntil')::timestamptz end;

    if v_permission is null or not exists(select 1 from public.store_permission_catalog c where c.permission_code=v_permission) then
      raise exception 'STORE_PERMISSION_CODE_INVALID';
    end if;
    if v_effect not in ('allow','deny') then raise exception 'STORE_PERMISSION_EFFECT_INVALID'; end if;
    if v_scope not in ('all','own','assigned','own_or_assigned','topic','mailbox') then raise exception 'STORE_PERMISSION_SCOPE_INVALID'; end if;
    if v_scope in ('topic','mailbox') and v_scope_value is null then raise exception 'STORE_PERMISSION_SCOPE_VALUE_REQUIRED'; end if;
    if v_scope not in ('topic','mailbox') then v_scope_value:=null; end if;
    if v_valid_until is not null and v_valid_until<=now() then raise exception 'STORE_PERMISSION_EXPIRY_REQUIRED_FUTURE'; end if;

    insert into public.store_permission_overrides(
      organization_id,instance_id,user_id,role_binding_id,permission_code,effect,scope_type,scope_value,valid_until,granted_by
    ) values(
      v_org,p_instance_id,p_target_user_id,v_binding.id,v_permission,v_effect,v_scope,v_scope_value,v_valid_until,p_actor_user_id
    );
    v_count:=v_count+1;
  end loop;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.permission_overrides_replaced','store_permission_override',p_target_user_id::text,v_org,p_instance_id,
    'Személyes webshop-jogosultságok módosítva',v_before,p_entries,
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_replace_permission_overrides_v1','overrideCount',v_count)
  );

  return jsonb_build_object('instanceId',p_instance_id,'userId',p_target_user_id,'overrideCount',v_count);
end;
$$;

create or replace function public.merchant_create_store_delegation_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_source_user_id uuid,
  p_delegate_user_id uuid,
  p_permission_codes text[],
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_source_binding public.role_bindings%rowtype;
  v_delegate_binding public.role_bindings%rowtype;
  v_delegation_id uuid;
  v_permissions text[];
  v_valid_from timestamptz:=coalesce(p_valid_from,now());
begin
  if p_instance_id is null or p_actor_user_id is null or p_source_user_id is null or p_delegate_user_id is null then
    raise exception 'STORE_DELEGATION_IDENTITY_REQUIRED';
  end if;
  if p_source_user_id=p_delegate_user_id then raise exception 'STORE_DELEGATION_SELF_FORBIDDEN'; end if;
  if not private.store_permission_admin_v1(p_instance_id,p_actor_user_id) then raise exception 'STORE_PERMISSION_OWNER_REQUIRED'; end if;
  if p_valid_until is null or p_valid_until<=v_valid_from then raise exception 'STORE_DELEGATION_EXPIRY_REQUIRED'; end if;
  if p_reason is not null and char_length(p_reason)>500 then raise exception 'STORE_DELEGATION_REASON_TOO_LONG'; end if;

  select array_agg(distinct x order by x) into v_permissions
  from unnest(coalesce(p_permission_codes,array[]::text[])) x;
  if coalesce(array_length(v_permissions,1),0)=0 or array_length(v_permissions,1)>50 then raise exception 'STORE_DELEGATION_PERMISSIONS_REQUIRED'; end if;
  if exists(
    select 1 from unnest(v_permissions) p
    left join public.store_permission_catalog c on c.permission_code=p
    where c.permission_code is null or not c.delegable
  ) then raise exception 'STORE_DELEGATION_PERMISSION_NOT_DELEGABLE'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select rb.* into v_source_binding from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_source_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by rb.created_at desc limit 1;
  select rb.* into v_delegate_binding from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_delegate_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by rb.created_at desc limit 1;
  if v_source_binding.id is null or v_delegate_binding.id is null then raise exception 'STORE_DELEGATION_ACTIVE_BINDINGS_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('store-delegation:'||p_instance_id::text||':'||p_source_user_id::text||':'||p_delegate_user_id::text,0));
  if exists(
    select 1 from public.store_delegations d
    where d.instance_id=p_instance_id and d.source_user_id=p_source_user_id and d.delegate_user_id=p_delegate_user_id
      and d.revoked_at is null and tstzrange(d.valid_from,d.valid_until,'[)') && tstzrange(v_valid_from,p_valid_until,'[)')
  ) then raise exception 'STORE_DELEGATION_OVERLAP'; end if;

  insert into public.store_delegations(
    organization_id,instance_id,source_user_id,delegate_user_id,source_role_binding_id,delegate_role_binding_id,
    valid_from,valid_until,reason,delegated_by
  ) values(
    v_org,p_instance_id,p_source_user_id,p_delegate_user_id,v_source_binding.id,v_delegate_binding.id,
    v_valid_from,p_valid_until,nullif(trim(coalesce(p_reason,'')),''),p_actor_user_id
  ) returning id into v_delegation_id;

  insert into public.store_delegation_permissions(delegation_id,permission_code)
  select v_delegation_id,x from unnest(v_permissions) x;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.delegation_created','store_delegation',v_delegation_id::text,v_org,p_instance_id,
    'Időszakos személyes helyettesítés létrehozva',null,
    jsonb_build_object('sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,'validFrom',v_valid_from,'validUntil',p_valid_until,'permissions',to_jsonb(v_permissions),'reason',nullif(trim(coalesce(p_reason,'')),'')),
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_create_store_delegation_v1')
  );

  return jsonb_build_object(
    'delegationId',v_delegation_id,'instanceId',p_instance_id,'sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,
    'validFrom',v_valid_from,'validUntil',p_valid_until,'permissionCount',array_length(v_permissions,1)
  );
end;
$$;

create or replace function public.merchant_revoke_store_delegation_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_delegation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_before jsonb;
begin
  if not private.store_permission_admin_v1(p_instance_id,p_actor_user_id) then raise exception 'STORE_PERMISSION_OWNER_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select jsonb_build_object(
    'sourceUserId',d.source_user_id,'delegateUserId',d.delegate_user_id,'validFrom',d.valid_from,'validUntil',d.valid_until,'reason',d.reason
  ) into v_before
  from public.store_delegations d
  where d.id=p_delegation_id and d.instance_id=p_instance_id and d.revoked_at is null
  for update;
  if v_before is null then raise exception 'STORE_DELEGATION_NOT_FOUND'; end if;

  update public.store_delegations set revoked_at=now(),updated_at=now()
  where id=p_delegation_id and instance_id=p_instance_id and revoked_at is null;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.delegation_revoked','store_delegation',p_delegation_id::text,v_org,p_instance_id,
    'Időszakos személyes helyettesítés visszavonva',v_before,null,
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_revoke_store_delegation_v1')
  );

  return jsonb_build_object('delegationId',p_delegation_id,'instanceId',p_instance_id,'revoked',true);
end;
$$;

revoke all on function private.store_permission_admin_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function private.store_scope_matches_v1(text,text,uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.evaluate_store_capability_v1(uuid,uuid,text,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.merchant_replace_permission_overrides_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) from public,anon,authenticated;
revoke all on function public.merchant_revoke_store_delegation_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.evaluate_store_capability_v1(uuid,uuid,text,uuid,uuid,text,text) to service_role;
grant execute on function public.merchant_replace_permission_overrides_v1(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) to service_role;
grant execute on function public.merchant_revoke_store_delegation_v1(uuid,uuid,uuid) to service_role;
