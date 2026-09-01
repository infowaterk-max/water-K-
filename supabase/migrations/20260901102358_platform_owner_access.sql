alter table public.platform_operators
  add column if not exists role text;

update public.platform_operators
set role='operator'
where role is null;

alter table public.platform_operators
  alter column role set default 'operator',
  alter column role set not null;

do $$
begin
  alter table public.platform_operators
    add constraint platform_operators_role_check
    check (role in ('owner','admin','operator'));
exception
  when duplicate_object then null;
end $$;

create table if not exists private.platform_owner_claims(
  email text primary key,
  full_name text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  constraint platform_owner_claims_normalized_email_check
    check (email = lower(trim(email)))
);

revoke all on private.platform_owner_claims from public, anon, authenticated;
grant select, insert, update, delete on private.platform_owner_claims to service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    exists(
      select 1
      from public.profiles
      where id=auth.uid() and role='admin'
    )
    or exists(
      select 1
      from public.platform_operators
      where user_id=auth.uid()
        and role in ('owner','admin','operator')
    );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type','customer');
  v_email text := lower(trim(coalesce(new.email,'')));
  v_claim_name text;
begin
  select full_name
    into v_claim_name
  from private.platform_owner_claims
  where email=v_email
    and claimed_at is null
  limit 1;

  insert into public.profiles(
    id,email,full_name,company_name,tax_number,role,reseller_approved
  )
  values(
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),
      v_claim_name
    ),
    nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),
    case
      when v_account_type='reseller' then 'reseller'::public.customer_role
      else 'customer'::public.customer_role
    end,
    false
  )
  on conflict(id) do update
    set email=excluded.email,
        full_name=coalesce(public.profiles.full_name, excluded.full_name);

  if v_claim_name is not null then
    insert into public.platform_operators(user_id, role)
    values(new.id, 'owner')
    on conflict(user_id) do update set role='owner';

    update private.platform_owner_claims
    set claimed_at=now(),
        claimed_by_user_id=new.id
    where email=v_email
      and claimed_at is null;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();
