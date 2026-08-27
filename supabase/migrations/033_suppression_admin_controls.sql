-- V8: audited manual suppression and release controls.
create table if not exists public.communication_suppression_events(
 id uuid primary key default gen_random_uuid(),
 suppression_id uuid references public.communication_suppressions(id) on delete set null,
 email text not null,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in('block','release')),
 reason text,
 note text,
 created_at timestamptz not null default now()
);
create index if not exists communication_suppression_events_email_idx on public.communication_suppression_events(lower(email),created_at desc);
alter table public.communication_suppression_events enable row level security;
revoke all on table public.communication_suppression_events from anon,authenticated;
grant select,insert on table public.communication_suppression_events to service_role;

create or replace function public.admin_block_communication_email(p_email text,p_actor uuid,p_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_email text:=lower(trim(p_email));
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if;
 if v_email='' then raise exception 'email required';end if;
 select id into v_id from public.communication_suppressions where lower(email)=v_email and active=true order by created_at desc limit 1 for update;
 if v_id is null then
  insert into public.communication_suppressions(email,reason,source,note,active) values(v_email,'manual','admin',left(p_note,1000),true) returning id into v_id;
 end if;
 insert into public.communication_suppression_events(suppression_id,email,actor_user_id,action,reason,note) values(v_id,v_email,p_actor,'block','manual',left(p_note,1000));
 return v_id;
end $$;

create or replace function public.admin_release_communication_suppression(p_suppression_id uuid,p_actor uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare s public.communication_suppressions%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if;
 select * into s from public.communication_suppressions where id=p_suppression_id for update;if not found then return false;end if;
 if not s.active then return true;end if;
 update public.communication_suppressions set active=false,released_at=now(),released_by=p_actor where id=s.id;
 insert into public.communication_suppression_events(suppression_id,email,actor_user_id,action,reason,note) values(s.id,s.email,p_actor,'release',s.reason,left(p_note,1000));
 return true;
end $$;
revoke all on function public.admin_block_communication_email(text,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_release_communication_suppression(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_block_communication_email(text,uuid,text) to service_role;
grant execute on function public.admin_release_communication_suppression(uuid,uuid,text) to service_role;
