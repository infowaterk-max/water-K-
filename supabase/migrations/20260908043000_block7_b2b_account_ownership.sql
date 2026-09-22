-- Block 7: customer-side B2B account ownership.
-- This model is deliberately separate from merchant public.organizations.
-- Existing customer_instance_roles remains a compatibility read-model for storefront pricing/catalog authority.

create table if not exists public.b2b_accounts(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 200),
  tax_number text,
  status text not null default 'pending' check(status in ('pending','approved','suspended')),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  status_changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,instance_id),
  check(tax_number is null or nullif(trim(tax_number),'') is not null),
  check(status<>'approved' or approved_at is not null)
);
create unique index if not exists b2b_accounts_instance_tax_unique
on public.b2b_accounts(instance_id,lower(regexp_replace(tax_number,'[^0-9A-Za-z]','','g')))
where tax_number is not null and nullif(trim(tax_number),'') is not null;
create index if not exists b2b_accounts_instance_status_idx on public.b2b_accounts(instance_id,status,created_at desc);

create table if not exists public.b2b_account_members(
  account_id uuid not null,
  instance_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','admin','buyer')),
  added_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,user_id),
  unique(instance_id,user_id),
  foreign key(account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete cascade
);
create index if not exists b2b_account_members_instance_account_idx on public.b2b_account_members(instance_id,account_id,role);

create table if not exists public.b2b_account_invitations(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  instance_id uuid not null,
  email text not null check(nullif(trim(email),'') is not null),
  role text not null check(role in ('admin','buyer')),
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete cascade,
  check(expires_at>created_at),
  check(not(accepted_at is not null and revoked_at is not null))
);
create unique index if not exists b2b_account_invitations_open_email_unique
on public.b2b_account_invitations(account_id,lower(trim(email)))
where accepted_at is null and revoked_at is null;
create index if not exists b2b_account_invitations_lookup_idx on public.b2b_account_invitations(instance_id,account_id,expires_at);

alter table public.customer_instance_roles add column if not exists b2b_account_id uuid;
do $$begin
 if not exists(select 1 from pg_constraint where conname='customer_instance_roles_b2b_account_fkey') then
  alter table public.customer_instance_roles add constraint customer_instance_roles_b2b_account_fkey
  foreign key(b2b_account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete restrict;
 end if;
end$$;
create index if not exists customer_instance_roles_b2b_account_idx on public.customer_instance_roles(instance_id,b2b_account_id) where b2b_account_id is not null;

alter table public.orders add column if not exists b2b_account_id uuid;
do $$begin
 if not exists(select 1 from pg_constraint where conname='orders_b2b_account_fkey') then
  alter table public.orders add constraint orders_b2b_account_fkey
  foreign key(b2b_account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete restrict;
 end if;
end$$;
create index if not exists orders_instance_b2b_account_created_idx on public.orders(instance_id,b2b_account_id,created_at desc) where b2b_account_id is not null;

alter table public.b2b_accounts enable row level security;
alter table public.b2b_account_members enable row level security;
alter table public.b2b_account_invitations enable row level security;
revoke all on table public.b2b_accounts from public,anon,authenticated;
revoke all on table public.b2b_account_members from public,anon,authenticated;
revoke all on table public.b2b_account_invitations from public,anon,authenticated;
grant select,insert,update,delete on table public.b2b_accounts to service_role;
grant select,insert,update,delete on table public.b2b_account_members to service_role;
grant select,insert,update,delete on table public.b2b_account_invitations to service_role;

create or replace function private.b2b_audit_v1(
 p_instance_id uuid,p_actor uuid,p_action text,p_entity_type text,p_entity_id text,p_summary text,
 p_before jsonb default null,p_after jsonb default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_id uuid;
begin
 if p_instance_id is null or p_actor is null then raise exception 'B2B_AUDIT_IDENTITY_REQUIRED';end if;
 select organization_id into v_org from public.webshop_instances where id=p_instance_id;
 if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
 insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
 values(p_actor,p_action,p_entity_type,p_entity_id,v_org,p_instance_id,p_summary,p_before,p_after,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('audit_source','database_rpc','authority','b2b_account'))
 returning id into v_id;
 if v_id is null then raise exception 'B2B_AUDIT_MISSING';end if;
 return v_id;
end$$;
revoke all on function private.b2b_audit_v1(uuid,uuid,text,text,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function private.has_b2b_purchase_authority_v1(p_instance_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.b2b_account_members m
  join public.b2b_accounts a on a.id=m.account_id and a.instance_id=m.instance_id
  join public.customer_instance_roles r on r.instance_id=m.instance_id and r.user_id=m.user_id and r.b2b_account_id=m.account_id
  where m.instance_id=p_instance_id and m.user_id=p_user_id
    and m.role in ('owner','admin','buyer') and a.status='approved'
    and r.role='reseller' and r.reseller_approved=true
 );
$$;
revoke all on function private.has_b2b_purchase_authority_v1(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function private.sync_b2b_member_relation_v1(p_instance_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_account public.b2b_accounts%rowtype;v_member public.b2b_account_members%rowtype;v_approved_by uuid;
begin
 select m.* into v_member from public.b2b_account_members m where m.instance_id=p_instance_id and m.user_id=p_user_id;
 if not found then
  update public.customer_instance_roles set role='customer',reseller_approved=false,reseller_requested_at=null,approved_at=null,approved_by=null,b2b_account_id=null,updated_at=now()
  where instance_id=p_instance_id and user_id=p_user_id;
  return;
 end if;
 select * into strict v_account from public.b2b_accounts where id=v_member.account_id and instance_id=p_instance_id;
 select case when v_account.approved_by is not null and exists(select 1 from public.profiles p where p.id=v_account.approved_by) then v_account.approved_by else null end into v_approved_by;
 insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved,reseller_requested_at,approved_at,approved_by,b2b_account_id,created_at,updated_at)
 values(p_instance_id,p_user_id,'reseller',v_account.status='approved',v_account.created_at,case when v_account.status='approved' then v_account.approved_at else null end,case when v_account.status='approved' then v_approved_by else null end,v_account.id,now(),now())
 on conflict(instance_id,user_id) do update set
  role='reseller',reseller_approved=excluded.reseller_approved,
  reseller_requested_at=coalesce(public.customer_instance_roles.reseller_requested_at,excluded.reseller_requested_at),
  approved_at=excluded.approved_at,approved_by=excluded.approved_by,b2b_account_id=excluded.b2b_account_id,updated_at=now();
end$$;
revoke all on function private.sync_b2b_member_relation_v1(uuid,uuid) from public,anon,authenticated,service_role;

-- Preserve all existing person-level reseller decisions without inferring shared ownership.
do $$
declare r record;v_account uuid;v_company text;v_tax text;v_approved_at timestamptz;
begin
 for r in select * from public.customer_instance_roles where role='reseller' and b2b_account_id is null order by instance_id,created_at,user_id loop
  select nullif(trim(p.company_name),''),nullif(trim(p.tax_number),'') into v_company,v_tax from public.profiles p where p.id=r.user_id;
  if v_company is null or v_tax is null then
   select coalesce(v_company,nullif(trim(o.billing_company),'')),coalesce(v_tax,nullif(trim(o.billing_tax_number),'')) into v_company,v_tax
   from public.orders o where o.instance_id=r.instance_id and o.customer_id=r.user_id order by o.created_at desc limit 1;
  end if;
  v_approved_at:=case when r.reseller_approved then coalesce(r.approved_at,now()) else null end;
  insert into public.b2b_accounts(instance_id,name,tax_number,status,created_by,approved_at,approved_by,status_changed_by)
  values(r.instance_id,coalesce(v_company,'B2B partner'),v_tax,case when r.reseller_approved then 'approved' else 'pending' end,r.user_id,v_approved_at,r.approved_by,r.user_id)
  returning id into v_account;
  insert into public.b2b_account_members(account_id,instance_id,user_id,role,added_by,updated_by)
  values(v_account,r.instance_id,r.user_id,'owner',r.user_id,r.user_id);
  update public.customer_instance_roles set b2b_account_id=v_account,approved_at=v_approved_at,updated_at=now()
  where instance_id=r.instance_id and user_id=r.user_id;
 end loop;
end$$;

update public.orders o set b2b_account_id=r.b2b_account_id
from public.customer_instance_roles r join public.b2b_accounts a on a.id=r.b2b_account_id and a.instance_id=r.instance_id
where o.instance_id=r.instance_id and o.customer_id=r.user_id and o.b2b_account_id is null
 and a.tax_number is not null and o.billing_tax_number is not null and nullif(trim(o.billing_company),'') is not null
 and lower(regexp_replace(o.billing_tax_number,'[^0-9A-Za-z]','','g'))=lower(regexp_replace(a.tax_number,'[^0-9A-Za-z]','','g'));

create or replace function private.enforce_customer_b2b_relation_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
 if new.role='reseller' then
  -- Registration may record a pending reseller intent before the organization is created.
  -- This state never grants B2B authority because reseller_approved must stay false.
  if new.b2b_account_id is null then
   if new.reseller_approved then raise exception 'B2B_ACCOUNT_REQUIRED';end if;
   return new;
  end if;
  select a.status into v_status from public.b2b_account_members m join public.b2b_accounts a on a.id=m.account_id and a.instance_id=m.instance_id
  where m.instance_id=new.instance_id and m.user_id=new.user_id and m.account_id=new.b2b_account_id;
  if not found then raise exception 'B2B_MEMBERSHIP_REQUIRED';end if;
  if new.reseller_approved is distinct from (v_status='approved') then raise exception 'B2B_ACCOUNT_APPROVAL_AUTHORITY_MISMATCH';end if;
 else
  if new.b2b_account_id is not null or new.reseller_approved then raise exception 'B2B_RELATION_CUSTOMER_STATE_INVALID';end if;
 end if;
 return new;
end$$;
revoke all on function private.enforce_customer_b2b_relation_v1() from public,anon,authenticated,service_role;
drop trigger if exists customer_b2b_relation_guard on public.customer_instance_roles;
create trigger customer_b2b_relation_guard before insert or update of role,reseller_approved,b2b_account_id,instance_id,user_id on public.customer_instance_roles for each row execute function private.enforce_customer_b2b_relation_v1();

create or replace function private.guard_last_b2b_owner_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if tg_op='DELETE' or (tg_op='UPDATE' and old.role='owner' and new.role<>'owner') then
  if old.role='owner' then
   select count(*) into v_count from public.b2b_account_members where account_id=old.account_id and user_id<>old.user_id and role='owner';
   if v_count=0 then raise exception 'LAST_B2B_ACCOUNT_OWNER';end if;
  end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end$$;
revoke all on function private.guard_last_b2b_owner_v1() from public,anon,authenticated,service_role;
drop trigger if exists b2b_last_owner_guard on public.b2b_account_members;
create trigger b2b_last_owner_guard before delete or update of role on public.b2b_account_members for each row execute function private.guard_last_b2b_owner_v1();

create or replace function private.reconcile_b2b_commercial_authority_v1(p_instance_id uuid,p_user_id uuid,p_actor uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_offers integer:=0;v_tasks integer:=0;v_opps integer:=0;
begin
 update public.commercial_offers f set status='cancelled',updated_at=now()
 where f.instance_id=p_instance_id and f.status in ('draft','approved','sent') and exists(
  select 1 from public.commercial_opportunities o where o.id=f.opportunity_id and o.instance_id=p_instance_id and o.channel='b2b' and o.reseller_id=p_user_id and o.status in ('open','in_progress'));
 get diagnostics v_offers=row_count;
 update public.sales_tasks t set status='cancelled',outcome='Automatikusan lezárva [b2b_account]: a szervezeti B2B jogosultság megszűnt.',completed_at=null,updated_at=now()
 where t.instance_id=p_instance_id and t.status in ('open','in_progress') and exists(select 1 from public.commercial_opportunities o where o.id=t.opportunity_id and o.instance_id=p_instance_id and o.channel='b2b' and o.reseller_id=p_user_id and o.status in ('open','in_progress'));
 get diagnostics v_tasks=row_count;
 update public.commercial_opportunities set status='dismissed',closed_at=now(),updated_at=now()
 where instance_id=p_instance_id and channel='b2b' and reseller_id=p_user_id and status in ('open','in_progress');
 get diagnostics v_opps=row_count;
 if v_offers>0 or v_tasks>0 or v_opps>0 then
  perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.account_commercial_reconciled','b2b_member',p_user_id::text,'B2B szervezeti jogosultsághoz kötött aktív kereskedelmi elemek lezárva',null,jsonb_build_object('dismissedOpportunities',v_opps,'cancelledTasks',v_tasks,'cancelledOffers',v_offers),jsonb_build_object('reason',p_reason));
 end if;
 return jsonb_build_object('dismissedOpportunities',v_opps,'cancelledTasks',v_tasks,'cancelledOffers',v_offers);
end$$;
revoke all on function private.reconcile_b2b_commercial_authority_v1(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function private.after_b2b_member_change_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_instance uuid;v_user uuid;v_actor uuid;v_status text;
begin
 v_instance:=case when tg_op='DELETE' then old.instance_id else new.instance_id end;
 v_user:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 v_actor:=case when tg_op='DELETE' then old.updated_by else new.updated_by end;
 perform private.sync_b2b_member_relation_v1(v_instance,v_user);
 if tg_op='DELETE' then
  select status into v_status from public.b2b_accounts where id=old.account_id and instance_id=old.instance_id;
  if v_status='approved' then perform private.reconcile_b2b_commercial_authority_v1(v_instance,v_user,v_actor,'membership_removed');end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end$$;
revoke all on function private.after_b2b_member_change_v1() from public,anon,authenticated,service_role;
drop trigger if exists b2b_member_relation_sync on public.b2b_account_members;
create trigger b2b_member_relation_sync after insert or update of role,account_id,instance_id,user_id or delete on public.b2b_account_members for each row execute function private.after_b2b_member_change_v1();

create or replace function private.after_b2b_account_status_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare m record;v_actor uuid;
begin
 if new.status is not distinct from old.status then return new;end if;
 v_actor:=coalesce(new.status_changed_by,new.approved_by,new.created_by);
 for m in select user_id from public.b2b_account_members where account_id=new.id and instance_id=new.instance_id loop
  perform private.sync_b2b_member_relation_v1(new.instance_id,m.user_id);
  if old.status='approved' and new.status<>'approved' then perform private.reconcile_b2b_commercial_authority_v1(new.instance_id,m.user_id,v_actor,'account_'||new.status);end if;
 end loop;
 return new;
end$$;
revoke all on function private.after_b2b_account_status_v1() from public,anon,authenticated,service_role;
drop trigger if exists b2b_account_status_sync on public.b2b_accounts;
create trigger b2b_account_status_sync after update of status on public.b2b_accounts for each row execute function private.after_b2b_account_status_v1();

create or replace function private.attach_b2b_order_context_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_account public.b2b_accounts%rowtype;v_account_id uuid;
begin
 if new.customer_id is null then
  if new.b2b_account_id is not null then raise exception 'B2B_ORDER_CUSTOMER_REQUIRED';end if;
  return new;
 end if;
 select a.* into v_account from public.b2b_account_members m join public.b2b_accounts a on a.id=m.account_id and a.instance_id=m.instance_id
 join public.customer_instance_roles r on r.instance_id=m.instance_id and r.user_id=m.user_id and r.b2b_account_id=m.account_id
 where m.instance_id=new.instance_id and m.user_id=new.customer_id and a.status='approved' and r.role='reseller' and r.reseller_approved=true;
 if found then
  v_account_id:=v_account.id;
  if nullif(trim(coalesce(new.billing_company,'')),'') is null then raise exception 'B2B_ORDER_COMPANY_REQUIRED';end if;
  if v_account.tax_number is not null and (new.billing_tax_number is null or lower(regexp_replace(new.billing_tax_number,'[^0-9A-Za-z]','','g'))<>lower(regexp_replace(v_account.tax_number,'[^0-9A-Za-z]','','g'))) then raise exception 'B2B_ORDER_TAX_MISMATCH';end if;
  if new.b2b_account_id is not null and new.b2b_account_id<>v_account_id then raise exception 'B2B_ORDER_ACCOUNT_MISMATCH';end if;
  new.b2b_account_id:=v_account_id;
 else
  if new.b2b_account_id is not null then raise exception 'B2B_ORDER_AUTHORITY_REQUIRED';end if;
  new.b2b_account_id:=null;
 end if;
 return new;
end$$;
revoke all on function private.attach_b2b_order_context_v1() from public,anon,authenticated,service_role;
drop trigger if exists orders_b2b_account_context on public.orders;
create trigger orders_b2b_account_context before insert or update of customer_id,billing_company,billing_tax_number,instance_id,b2b_account_id on public.orders for each row execute function private.attach_b2b_order_context_v1();

create or replace function private.enforce_commercial_offer_authority_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_opp public.commercial_opportunities%rowtype;
begin
 if new.status not in ('draft','approved','sent','accepted') then return new;end if;
 select * into v_opp from public.commercial_opportunities where id=new.opportunity_id and instance_id=new.instance_id;
 if not found then raise exception 'COMMERCIAL_OPPORTUNITY_TENANT_MISMATCH';end if;
 if v_opp.status not in ('open','in_progress') then raise exception 'COMMERCIAL_OPPORTUNITY_NOT_ACTIVE';end if;
 if not exists(select 1 from public.product_variants pv where pv.id=new.variant_id and pv.instance_id=new.instance_id) then raise exception 'COMMERCIAL_VARIANT_TENANT_MISMATCH';end if;
 if v_opp.channel='b2b' and (v_opp.reseller_id is null or not private.has_b2b_purchase_authority_v1(new.instance_id,v_opp.reseller_id)) then raise exception 'B2B_ACCOUNT_AUTHORITY_REQUIRED';end if;
 return new;
end$$;
revoke all on function private.enforce_commercial_offer_authority_v1() from public,anon,authenticated,service_role;

create or replace function public.resolve_b2b_account_context_v1(p_instance_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v record;
begin
 select a.id,a.name,a.tax_number,a.status,a.approved_at,m.role,r.reseller_requested_at into v
 from public.b2b_account_members m join public.b2b_accounts a on a.id=m.account_id and a.instance_id=m.instance_id
 left join public.customer_instance_roles r on r.instance_id=m.instance_id and r.user_id=m.user_id
 where m.instance_id=p_instance_id and m.user_id=p_user_id;
 if not found then return null;end if;
 return jsonb_build_object('accountId',v.id,'accountName',v.name,'taxNumber',v.tax_number,'status',v.status,'memberRole',v.role,'approved',v.status='approved','requestedAt',v.reseller_requested_at,'approvedAt',v.approved_at);
end$$;
revoke all on function public.resolve_b2b_account_context_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.resolve_b2b_account_context_v1(uuid,uuid) to service_role;

create or replace function public.request_reseller_status_v2(p_instance_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.profiles%rowtype;v_existing jsonb;v_account uuid;v_relation public.customer_instance_roles%rowtype;v_tax_norm text;
begin
 if p_instance_id is null or p_user_id is null then raise exception 'RESELLER_REQUEST_IDENTITY_REQUIRED';end if;
 if not exists(select 1 from public.webshop_instances where id=p_instance_id and status in ('pilot','active')) then raise exception 'RESELLER_REQUEST_STORE_INACTIVE';end if;
 select * into v_profile from public.profiles where id=p_user_id;
 if not found then raise exception 'RESELLER_REQUEST_PROFILE_NOT_FOUND';end if;
 select public.resolve_b2b_account_context_v1(p_instance_id,p_user_id) into v_existing;
 if v_existing is not null then
  select * into v_relation from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_user_id;
  return jsonb_build_object('userId',p_user_id,'role','reseller','approved',coalesce(v_relation.reseller_approved,false),'requestedAt',v_relation.reseller_requested_at,'replayed',true,'accountId',v_existing->>'accountId','memberRole',v_existing->>'memberRole','accountStatus',v_existing->>'status');
 end if;
 if nullif(trim(coalesce(v_profile.company_name,'')),'') is null then raise exception 'B2B_COMPANY_REQUIRED';end if;
 if nullif(trim(coalesce(v_profile.tax_number,'')),'') is null then raise exception 'B2B_TAX_NUMBER_REQUIRED';end if;
 v_tax_norm:=lower(regexp_replace(v_profile.tax_number,'[^0-9A-Za-z]','','g'));
 if exists(select 1 from public.b2b_accounts where instance_id=p_instance_id and lower(regexp_replace(coalesce(tax_number,''),'[^0-9A-Za-z]','','g'))=v_tax_norm) then raise exception 'B2B_ACCOUNT_INVITATION_REQUIRED';end if;
 insert into public.b2b_accounts(instance_id,name,tax_number,status,created_by,status_changed_by) values(p_instance_id,trim(v_profile.company_name),trim(v_profile.tax_number),'pending',p_user_id,p_user_id) returning id into v_account;
 insert into public.b2b_account_members(account_id,instance_id,user_id,role,added_by,updated_by) values(v_account,p_instance_id,p_user_id,'owner',p_user_id,p_user_id);
 select * into strict v_relation from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_user_id;
 perform private.b2b_audit_v1(p_instance_id,p_user_id,'b2b.account_requested','b2b_account',v_account::text,'B2B szervezeti partnerfiók igényelve',null,jsonb_build_object('accountId',v_account,'name',v_profile.company_name,'status','pending'),jsonb_build_object('memberRole','owner'));
 return jsonb_build_object('userId',p_user_id,'role','reseller','approved',false,'requestedAt',v_relation.reseller_requested_at,'replayed',false,'accountId',v_account,'memberRole','owner','accountStatus','pending');
end$$;
revoke all on function public.request_reseller_status_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.request_reseller_status_v2(uuid,uuid) to service_role;

create or replace function public.b2b_invite_member_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_email text,p_role text,p_token_hash text,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text;v_id uuid;
begin
 select role into v_actor_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor;
 if v_actor_role not in ('owner','admin') then raise exception 'B2B_ACCOUNT_ADMIN_REQUIRED';end if;
 if p_role not in ('admin','buyer') then raise exception 'B2B_INVITE_ROLE_INVALID';end if;
 if nullif(trim(coalesce(p_email,'')),'') is null then raise exception 'B2B_INVITE_EMAIL_REQUIRED';end if;
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at<=now() then raise exception 'B2B_INVITE_TOKEN_INVALID';end if;
 if exists(select 1 from public.profiles p join public.b2b_account_members m on m.user_id=p.id where m.instance_id=p_instance_id and lower(trim(coalesce(p.email,'')))=lower(trim(p_email))) then raise exception 'B2B_MEMBER_ALREADY_ASSIGNED';end if;
 update public.b2b_account_invitations set revoked_at=now(),revoked_by=p_actor where account_id=p_account_id and lower(trim(email))=lower(trim(p_email)) and accepted_at is null and revoked_at is null;
 insert into public.b2b_account_invitations(account_id,instance_id,email,role,token_hash,invited_by,expires_at) values(p_account_id,p_instance_id,trim(p_email),p_role,p_token_hash,p_actor,p_expires_at) returning id into v_id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.member_invited','b2b_invitation',v_id::text,'B2B szervezeti meghívó létrehozva',null,jsonb_build_object('accountId',p_account_id,'email',lower(trim(p_email)),'role',p_role,'expiresAt',p_expires_at),jsonb_build_object('tokenStoredAs','sha256'));
 return jsonb_build_object('invitationId',v_id,'accountId',p_account_id,'email',lower(trim(p_email)),'role',p_role,'expiresAt',p_expires_at);
end$$;

create or replace function public.b2b_accept_invitation_v1(p_instance_id uuid,p_actor uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_inv public.b2b_account_invitations%rowtype;v_email text;
begin
 select * into v_inv from public.b2b_account_invitations where instance_id=p_instance_id and token_hash=p_token_hash for update;
 if not found then raise exception 'B2B_INVITATION_NOT_FOUND';end if;
 if v_inv.accepted_at is not null or v_inv.revoked_at is not null or v_inv.expires_at<=now() then raise exception 'B2B_INVITATION_INACTIVE';end if;
 select lower(trim(coalesce(email,''))) into v_email from public.profiles where id=p_actor;
 if v_email='' or v_email<>lower(trim(v_inv.email)) then raise exception 'B2B_INVITATION_EMAIL_MISMATCH';end if;
 if exists(select 1 from public.b2b_account_members where instance_id=p_instance_id and user_id=p_actor) then raise exception 'B2B_MEMBER_ALREADY_ASSIGNED';end if;
 insert into public.b2b_account_members(account_id,instance_id,user_id,role,added_by,updated_by) values(v_inv.account_id,p_instance_id,p_actor,v_inv.role,v_inv.invited_by,p_actor);
 update public.b2b_account_invitations set accepted_at=now(),accepted_by=p_actor where id=v_inv.id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.member_joined','b2b_account',v_inv.account_id::text,'Felhasználó B2B szervezethez csatlakozott',null,jsonb_build_object('userId',p_actor,'role',v_inv.role),jsonb_build_object('invitationId',v_inv.id));
 return jsonb_build_object('accountId',v_inv.account_id,'userId',p_actor,'role',v_inv.role);
end$$;

create or replace function public.b2b_set_member_role_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_user_id uuid,p_role text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text;v_target_role text;
begin
 select role into v_actor_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor;
 if v_actor_role<>'owner' then raise exception 'B2B_ACCOUNT_OWNER_REQUIRED';end if;
 if p_role not in ('admin','buyer') then raise exception 'B2B_MEMBER_ROLE_INVALID';end if;
 select role into v_target_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id for update;
 if not found then raise exception 'B2B_MEMBER_NOT_FOUND';end if;
 if v_target_role='owner' then raise exception 'B2B_OWNER_TRANSFER_REQUIRED';end if;
 update public.b2b_account_members set role=p_role,updated_by=p_actor,updated_at=now() where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.member_role_updated','b2b_account',p_account_id::text,'B2B szervezeti tagszerep módosítva',jsonb_build_object('userId',p_user_id,'role',v_target_role),jsonb_build_object('userId',p_user_id,'role',p_role),null);
 return jsonb_build_object('accountId',p_account_id,'userId',p_user_id,'role',p_role);
end$$;

create or replace function public.b2b_transfer_ownership_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text;v_target_role text;
begin
 if p_actor=p_user_id then raise exception 'B2B_OWNERSHIP_TARGET_INVALID';end if;
 select role into v_actor_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor for update;
 if v_actor_role<>'owner' then raise exception 'B2B_ACCOUNT_OWNER_REQUIRED';end if;
 select role into v_target_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id for update;
 if not found then raise exception 'B2B_MEMBER_NOT_FOUND';end if;
 update public.b2b_account_members set role='owner',updated_by=p_actor,updated_at=now() where account_id=p_account_id and user_id=p_user_id;
 update public.b2b_account_members set role='admin',updated_by=p_actor,updated_at=now() where account_id=p_account_id and user_id=p_actor;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.ownership_transferred','b2b_account',p_account_id::text,'B2B szervezet tulajdonjoga átadva',jsonb_build_object('ownerUserId',p_actor),jsonb_build_object('ownerUserId',p_user_id,'previousOwnerRole','admin'),null);
 return jsonb_build_object('accountId',p_account_id,'ownerUserId',p_user_id,'previousOwnerUserId',p_actor);
end$$;

create or replace function public.b2b_remove_member_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text;v_target_role text;
begin
 select role into v_actor_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor;
 select role into v_target_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id for update;
 if not found then raise exception 'B2B_MEMBER_NOT_FOUND';end if;
 if p_actor<>p_user_id then
  if v_actor_role='owner' then null;
  elsif v_actor_role='admin' and v_target_role='buyer' then null;
  else raise exception 'B2B_MEMBER_REMOVE_FORBIDDEN';end if;
 end if;
 if v_target_role='owner' then raise exception 'B2B_OWNER_TRANSFER_REQUIRED';end if;
 update public.b2b_account_members set updated_by=p_actor,updated_at=now() where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id;
 delete from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_user_id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.member_removed','b2b_account',p_account_id::text,'B2B szervezeti tagság megszüntetve',jsonb_build_object('userId',p_user_id,'role',v_target_role),null,null);
 return jsonb_build_object('accountId',p_account_id,'userId',p_user_id,'removed',true);
end$$;

create or replace function public.b2b_revoke_invitation_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_invitation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor_role text;v_count integer;
begin
 select role into v_actor_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor;
 if v_actor_role not in ('owner','admin') then raise exception 'B2B_ACCOUNT_ADMIN_REQUIRED';end if;
 update public.b2b_account_invitations set revoked_at=now(),revoked_by=p_actor where id=p_invitation_id and instance_id=p_instance_id and account_id=p_account_id and accepted_at is null and revoked_at is null;
 get diagnostics v_count=row_count;if v_count<>1 then raise exception 'B2B_INVITATION_NOT_FOUND';end if;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.invitation_revoked','b2b_invitation',p_invitation_id::text,'B2B szervezeti meghívó visszavonva',null,jsonb_build_object('accountId',p_account_id,'revoked',true),null);
 return jsonb_build_object('invitationId',p_invitation_id,'revoked',true);
end$$;

create or replace function public.admin_set_b2b_account_status_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_before public.b2b_accounts%rowtype;v_after public.b2b_accounts%rowtype;
begin
 if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED';end if;
 if p_status not in ('pending','approved','suspended') then raise exception 'B2B_ACCOUNT_STATUS_INVALID';end if;
 select * into v_before from public.b2b_accounts where id=p_account_id and instance_id=p_instance_id for update;
 if not found then raise exception 'B2B_ACCOUNT_NOT_FOUND';end if;
 update public.b2b_accounts set status=p_status,approved_at=case when p_status='approved' then coalesce(approved_at,now()) else approved_at end,approved_by=case when p_status='approved' then p_actor else approved_by end,status_changed_by=p_actor,updated_at=now()
 where id=p_account_id and instance_id=p_instance_id returning * into v_after;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.account_status_updated','b2b_account',p_account_id::text,'B2B szervezeti partnerstátusz módosítva',to_jsonb(v_before),to_jsonb(v_after),null);
 return jsonb_build_object('accountId',v_after.id,'status',v_after.status,'approvedAt',v_after.approved_at,'updatedAt',v_after.updated_at);
end$$;

revoke all on function public.b2b_invite_member_v1(uuid,uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.b2b_accept_invitation_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.b2b_set_member_role_v1(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.b2b_transfer_ownership_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.b2b_remove_member_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.b2b_revoke_invitation_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_set_b2b_account_status_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.b2b_invite_member_v1(uuid,uuid,uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.b2b_accept_invitation_v1(uuid,uuid,text) to service_role;
grant execute on function public.b2b_set_member_role_v1(uuid,uuid,uuid,uuid,text) to service_role;
grant execute on function public.b2b_transfer_ownership_v1(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.b2b_remove_member_v1(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.b2b_revoke_invitation_v1(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.admin_set_b2b_account_status_v1(uuid,uuid,uuid,text) to service_role;

comment on table public.b2b_accounts is 'Customer-side B2B organization/account. Separate from merchant public.organizations.';
comment on table public.b2b_account_members is 'Tenant-scoped B2B account membership with owner/admin/buyer roles.';
comment on table public.b2b_account_invitations is 'Hashed-token B2B membership invitations; raw invite tokens are never stored.';
comment on column public.orders.b2b_account_id is 'Authoritative B2B organization identity snapshot for organization-scoped order visibility.';
