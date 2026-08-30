create schema if not exists private;
create table if not exists private.stock_notification_rate_limits(id bigint generated always as identity primary key,email text not null,ip text not null,requested_at timestamptz not null default now());
alter table private.stock_notification_rate_limits enable row level security;
create index if not exists stock_notification_rate_limits_email_requested_idx on private.stock_notification_rate_limits(email,requested_at desc);
create index if not exists stock_notification_rate_limits_ip_requested_idx on private.stock_notification_rate_limits(ip,requested_at desc);
revoke all on private.stock_notification_rate_limits from public,anon,authenticated;

create or replace function public.allow_stock_notification_request(p_email text,p_ip text)
returns boolean language plpgsql security definer set search_path='' as $$
declare normalized_email text:=lower(trim(coalesce(p_email,''))); normalized_ip text:=left(trim(coalesce(p_ip,'unknown')),100); email_count integer; ip_count integer;
begin
 if normalized_email='' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
 select count(*) into email_count from private.stock_notification_rate_limits where email=normalized_email and requested_at>now()-interval '1 hour';
 select count(*) into ip_count from private.stock_notification_rate_limits where ip=normalized_ip and requested_at>now()-interval '1 hour';
 if email_count>=3 or ip_count>=12 then return false; end if;
 insert into private.stock_notification_rate_limits(email,ip) values(normalized_email,normalized_ip);
 return true;
end;$$;
revoke execute on function public.allow_stock_notification_request(text,text) from public,anon,authenticated;
grant execute on function public.allow_stock_notification_request(text,text) to service_role;
