alter table public.orders add column if not exists confirmation_token uuid;
update public.orders set confirmation_token = gen_random_uuid() where confirmation_token is null;
alter table public.orders alter column confirmation_token set default gen_random_uuid();
alter table public.orders alter column confirmation_token set not null;
create unique index if not exists orders_confirmation_token_key on public.orders(confirmation_token);

revoke all on function public.claim_integration_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_integration_jobs(integer) to service_role;

revoke all on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,jsonb) to service_role;
grant execute on function public.place_order(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) to service_role;

revoke all on function public.place_order_idempotent(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order_idempotent(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,jsonb) to service_role;
