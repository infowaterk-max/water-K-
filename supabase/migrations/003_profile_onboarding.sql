create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_account_type text := coalesce(new.raw_user_meta_data->>'account_type','customer');
begin
  insert into public.profiles(id,email,full_name,company_name,tax_number,role,reseller_approved)
  values(new.id,new.email,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),case when v_account_type='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,false)
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;

revoke update on public.profiles from authenticated;
grant update(full_name,company_name,tax_number) on public.profiles to authenticated;

-- Privileged role changes are intentionally not exposed as a database RPC.
-- Reseller approval and role changes go through authenticated Next.js admin routes
-- using the server-only Supabase secret/service-role key.
