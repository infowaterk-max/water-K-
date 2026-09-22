-- Shared customer billing profile + B2B verified identity re-verification.
-- Platform authority: templates may present these capabilities but never own their business rules.

create table if not exists public.customer_billing_profiles(
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_name text not null check(char_length(trim(billing_name)) between 2 and 160),
  billing_postcode text not null check(char_length(trim(billing_postcode)) between 2 and 20),
  billing_city text not null check(char_length(trim(billing_city)) between 2 and 120),
  billing_address text not null check(char_length(trim(billing_address)) between 2 and 300),
  phone text check(phone is null or char_length(trim(phone)) between 5 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,user_id)
);
alter table public.customer_billing_profiles enable row level security;
revoke all on table public.customer_billing_profiles from public,anon,authenticated;
grant select,insert,update,delete on table public.customer_billing_profiles to service_role;

create table if not exists public.b2b_account_identity_change_requests(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  account_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  current_name text not null,
  current_tax_number text,
  requested_name text not null,
  requested_tax_number text not null,
  previous_account_status text not null check(previous_account_status in ('pending','approved','suspended')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(account_id,instance_id) references public.b2b_accounts(id,instance_id) on delete cascade
);
create unique index if not exists b2b_identity_change_one_pending_idx on public.b2b_account_identity_change_requests(account_id) where status='pending';
create index if not exists b2b_identity_change_instance_status_idx on public.b2b_account_identity_change_requests(instance_id,status,created_at desc);
alter table public.b2b_account_identity_change_requests enable row level security;
revoke all on table public.b2b_account_identity_change_requests from public,anon,authenticated;
grant select,insert,update,delete on table public.b2b_account_identity_change_requests to service_role;

create or replace function private.is_valid_hu_tax_number_v1(p_value text)
returns boolean language plpgsql immutable set search_path='' as $$
declare v text;v_sum integer;v_check integer;
begin
 v:=regexp_replace(coalesce(p_value,''),'[^0-9]','','g');
 if length(v)<>11 then return false;end if;
 v_sum:=(substr(v,1,1)::int*9)+(substr(v,2,1)::int*7)+(substr(v,3,1)::int*3)+(substr(v,4,1)::int)+(substr(v,5,1)::int*9)+(substr(v,6,1)::int*7)+(substr(v,7,1)::int*3);
 v_check:=(10-(v_sum%10))%10;
 return v_check=substr(v,8,1)::int;
exception when others then return false;
end$$;
revoke all on function private.is_valid_hu_tax_number_v1(text) from public,anon,authenticated,service_role;

create or replace function private.enforce_b2b_verified_identity_write_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.name is distinct from old.name or new.tax_number is distinct from old.tax_number)
    and coalesce(current_setting('shoporation.b2b_identity_approved_write',true),'')<>old.id::text then
   raise exception 'B2B_IDENTITY_DIRECT_MUTATION_FORBIDDEN';
 end if;
 return new;
end$$;
revoke all on function private.enforce_b2b_verified_identity_write_v1() from public,anon,authenticated,service_role;
drop trigger if exists b2b_verified_identity_write_guard on public.b2b_accounts;
create trigger b2b_verified_identity_write_guard before update of name,tax_number on public.b2b_accounts for each row execute function private.enforce_b2b_verified_identity_write_v1();

create or replace function public.b2b_request_identity_change_v1(p_instance_id uuid,p_account_id uuid,p_actor uuid,p_name text,p_tax_number text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_account public.b2b_accounts%rowtype;v_role text;v_id uuid;v_name text;v_tax text;
begin
 v_name:=trim(coalesce(p_name,''));v_tax:=trim(coalesce(p_tax_number,''));
 if char_length(v_name)<2 or char_length(v_name)>200 then raise exception 'B2B_IDENTITY_NAME_INVALID';end if;
 if not private.is_valid_hu_tax_number_v1(v_tax) then raise exception 'B2B_IDENTITY_TAX_INVALID';end if;
 select * into v_account from public.b2b_accounts where id=p_account_id and instance_id=p_instance_id for update;
 if not found then raise exception 'B2B_ACCOUNT_NOT_FOUND';end if;
 select role into v_role from public.b2b_account_members where instance_id=p_instance_id and account_id=p_account_id and user_id=p_actor;
 if v_role<>'owner' then raise exception 'B2B_ACCOUNT_OWNER_REQUIRED';end if;
 if exists(select 1 from public.b2b_account_identity_change_requests where account_id=p_account_id and status='pending') then raise exception 'B2B_IDENTITY_CHANGE_ALREADY_PENDING';end if;
 if lower(v_name)=lower(trim(v_account.name)) and regexp_replace(v_tax,'[^0-9]','','g')=regexp_replace(coalesce(v_account.tax_number,''),'[^0-9]','','g') then raise exception 'B2B_IDENTITY_CHANGE_NOOP';end if;
 if exists(select 1 from public.b2b_accounts a where a.instance_id=p_instance_id and a.id<>p_account_id and regexp_replace(coalesce(a.tax_number,''),'[^0-9A-Za-z]','','g')=regexp_replace(v_tax,'[^0-9A-Za-z]','','g')) then raise exception 'B2B_TAX_NUMBER_ALREADY_REGISTERED';end if;
 insert into public.b2b_account_identity_change_requests(instance_id,account_id,requested_by,current_name,current_tax_number,requested_name,requested_tax_number,previous_account_status)
 values(p_instance_id,p_account_id,p_actor,v_account.name,v_account.tax_number,v_name,v_tax,v_account.status) returning id into v_id;
 if v_account.status='approved' then update public.b2b_accounts set status='pending',status_changed_by=p_actor,updated_at=now() where id=p_account_id and instance_id=p_instance_id;end if;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.identity_change_requested','b2b_account',p_account_id::text,'B2B hitelesített cégadat módosítása jóváhagyásra benyújtva',
   jsonb_build_object('name',v_account.name,'taxNumber',v_account.tax_number,'status',v_account.status),
   jsonb_build_object('requestId',v_id,'requestedName',v_name,'requestedTaxNumber',v_tax,'status',case when v_account.status='approved' then 'pending' else v_account.status end),
   jsonb_build_object('requiresMerchantApproval',true));
 return jsonb_build_object('requestId',v_id,'accountId',p_account_id,'status','pending');
end$$;

create or replace function public.admin_review_b2b_identity_change_v1(p_instance_id uuid,p_request_id uuid,p_actor uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.b2b_account_identity_change_requests%rowtype;v_account public.b2b_accounts%rowtype;v_after public.b2b_accounts%rowtype;v_status text;
begin
 if not public.can_manage_sales(p_instance_id,p_actor) then raise exception 'SALES_PERMISSION_REQUIRED';end if;
 if p_decision not in ('approved','rejected') then raise exception 'B2B_IDENTITY_REVIEW_DECISION_INVALID';end if;
 select * into v_request from public.b2b_account_identity_change_requests where id=p_request_id and instance_id=p_instance_id and status='pending' for update;
 if not found then raise exception 'B2B_IDENTITY_CHANGE_NOT_PENDING';end if;
 select * into v_account from public.b2b_accounts where id=v_request.account_id and instance_id=p_instance_id for update;
 if not found then raise exception 'B2B_ACCOUNT_NOT_FOUND';end if;
 v_status:=v_request.previous_account_status;
 if p_decision='approved' then
   perform set_config('shoporation.b2b_identity_approved_write',v_account.id::text,true);
   update public.b2b_accounts set name=v_request.requested_name,tax_number=v_request.requested_tax_number,status=v_status,
     approved_at=case when v_status='approved' then now() else approved_at end,
     approved_by=case when v_status='approved' then p_actor else approved_by end,
     status_changed_by=p_actor,updated_at=now()
   where id=v_account.id and instance_id=p_instance_id returning * into v_after;
 else
   update public.b2b_accounts set status=v_status,status_changed_by=p_actor,updated_at=now()
   where id=v_account.id and instance_id=p_instance_id returning * into v_after;
 end if;
 update public.b2b_account_identity_change_requests set status=p_decision,reviewed_by=p_actor,reviewed_at=now(),review_note=nullif(trim(coalesce(p_note,'')),''),updated_at=now() where id=p_request_id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.identity_change_'||p_decision,'b2b_account',v_account.id::text,
   case when p_decision='approved' then 'B2B hitelesített cégadat módosítás jóváhagyva' else 'B2B hitelesített cégadat módosítás elutasítva' end,
   jsonb_build_object('name',v_account.name,'taxNumber',v_account.tax_number,'status',v_account.status,'requestId',p_request_id),
   jsonb_build_object('name',v_after.name,'taxNumber',v_after.tax_number,'status',v_after.status,'requestId',p_request_id),
   jsonb_build_object('decision',p_decision,'note',nullif(trim(coalesce(p_note,'')),''))
 );
 return jsonb_build_object('requestId',p_request_id,'accountId',v_account.id,'decision',p_decision,'accountStatus',v_after.status);
end$$;

create or replace function public.b2b_cancel_identity_change_v1(p_instance_id uuid,p_request_id uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.b2b_account_identity_change_requests%rowtype;v_role text;
begin
 select * into v_request from public.b2b_account_identity_change_requests where id=p_request_id and instance_id=p_instance_id and status='pending' for update;
 if not found then raise exception 'B2B_IDENTITY_CHANGE_NOT_PENDING';end if;
 select role into v_role from public.b2b_account_members where instance_id=p_instance_id and account_id=v_request.account_id and user_id=p_actor;
 if v_role<>'owner' then raise exception 'B2B_ACCOUNT_OWNER_REQUIRED';end if;
 update public.b2b_accounts set status=v_request.previous_account_status,status_changed_by=p_actor,updated_at=now() where id=v_request.account_id and instance_id=p_instance_id;
 update public.b2b_account_identity_change_requests set status='cancelled',reviewed_by=p_actor,reviewed_at=now(),updated_at=now() where id=p_request_id;
 perform private.b2b_audit_v1(p_instance_id,p_actor,'b2b.identity_change_cancelled','b2b_account',v_request.account_id::text,'B2B cégadat módosítási kérelem visszavonva',
   jsonb_build_object('requestId',p_request_id,'requestedName',v_request.requested_name,'requestedTaxNumber',v_request.requested_tax_number),
   jsonb_build_object('requestId',p_request_id,'restoredStatus',v_request.previous_account_status),null);
 return jsonb_build_object('requestId',p_request_id,'accountId',v_request.account_id,'status','cancelled');
end$$;

revoke all on function public.b2b_request_identity_change_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.admin_review_b2b_identity_change_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.b2b_cancel_identity_change_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.b2b_request_identity_change_v1(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.admin_review_b2b_identity_change_v1(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.b2b_cancel_identity_change_v1(uuid,uuid,uuid) to service_role;

create or replace function private.audit_reseller_registration_intent_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='reseller' and new.reseller_approved=false and new.b2b_account_id is null and new.reseller_requested_at is not null then
   perform private.b2b_audit_v1(new.instance_id,new.user_id,'b2b.reseller_registration_intent','customer',new.user_id::text,'Viszonteladói regisztrációs szándék rögzítve',
     null,jsonb_build_object('role','reseller','approved',false,'requestedAt',new.reseller_requested_at),jsonb_build_object('authority','customer_instance_roles'));
 end if;
 return new;
end$$;
revoke all on function private.audit_reseller_registration_intent_v1() from public,anon,authenticated,service_role;
drop trigger if exists customer_reseller_registration_intent_audit on public.customer_instance_roles;
create trigger customer_reseller_registration_intent_audit after insert on public.customer_instance_roles for each row execute function private.audit_reseller_registration_intent_v1();

comment on table public.customer_billing_profiles is 'Tenant-scoped saved billing defaults. Order billing fields remain immutable order snapshots.';
comment on table public.b2b_account_identity_change_requests is 'Audited re-verification queue for legal B2B company name and tax-number changes.';
