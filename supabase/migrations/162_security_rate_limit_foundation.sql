-- V22: distributed rate limit buckets for sensitive server-side actions.
create table if not exists public.security_rate_limits(
 rate_key text primary key,window_started_at timestamptz not null,count integer not null check(count>=0),updated_at timestamptz not null default now()
);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public,anon,authenticated,service_role;

create or replace function public.consume_security_rate_limit(p_rate_key text,p_window_seconds integer,p_max_count integer)
returns boolean language plpgsql security definer set search_path=''
as $$declare r public.security_rate_limits;now_ts timestamptz:=now();begin
 if nullif(trim(p_rate_key),'') is null or p_window_seconds<1 or p_window_seconds>3600 or p_max_count<1 or p_max_count>10000 then raise exception 'invalid_rate_limit';end if;
 perform pg_advisory_xact_lock(hashtextextended('rate:'||p_rate_key,0));
 select * into r from public.security_rate_limits where rate_key=p_rate_key for update;
 if not found or r.window_started_at<=now_ts-make_interval(secs=>p_window_seconds) then
  insert into public.security_rate_limits(rate_key,window_started_at,count,updated_at) values(p_rate_key,now_ts,1,now_ts)
  on conflict(rate_key) do update set window_started_at=excluded.window_started_at,count=1,updated_at=excluded.updated_at;
  return true;
 end if;
 if r.count>=p_max_count then return false;end if;
 update public.security_rate_limits set count=count+1,updated_at=now_ts where rate_key=p_rate_key;
 return true;
end;$$;
revoke all on function public.consume_security_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_security_rate_limit(text,integer,integer) to service_role;
