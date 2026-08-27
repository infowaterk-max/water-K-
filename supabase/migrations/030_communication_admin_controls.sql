-- V8: audited administrative controls for queued communication.
create table if not exists public.communication_job_events(
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.communication_jobs(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in('cancel','reschedule','approve','retry')),
 previous_status text,
 new_status text,
 previous_scheduled_at timestamptz,
 new_scheduled_at timestamptz,
 note text,
 created_at timestamptz not null default now()
);
create index if not exists communication_job_events_job_idx on public.communication_job_events(job_id,created_at desc);
alter table public.communication_job_events enable row level security;

create or replace function public.admin_manage_communication_job(p_job_id uuid,p_actor uuid,p_action text,p_scheduled_at timestamptz default null,p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare j public.communication_jobs%rowtype; v_status text; v_schedule timestamptz;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required'; end if;
 select * into j from public.communication_jobs where id=p_job_id for update;if not found then return false;end if;
 if p_action='cancel' then if j.status not in('pending','failed','blocked') then raise exception 'job cannot be cancelled';end if;v_status='cancelled';v_schedule=j.scheduled_at;
 elsif p_action='reschedule' then if j.status not in('pending','failed','blocked') or p_scheduled_at is null then raise exception 'job cannot be rescheduled';end if;v_status='pending';v_schedule=p_scheduled_at;
 elsif p_action='retry' then if j.status not in('failed','blocked') then raise exception 'job cannot be retried';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,now());
 elsif p_action='approve' then if j.status<>'pending' then raise exception 'job cannot be approved';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,j.scheduled_at);
 else raise exception 'invalid action';end if;
 update public.communication_jobs set status=v_status,scheduled_at=v_schedule,last_error=case when p_action in('retry','reschedule') then null else last_error end,claim_token=null,claimed_at=null,updated_at=now() where id=j.id;
 insert into public.communication_job_events(job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note) values(j.id,p_actor,p_action,j.status,v_status,j.scheduled_at,v_schedule,left(p_note,1000));return true;
end $$;
revoke all on function public.admin_manage_communication_job(uuid,uuid,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_manage_communication_job(uuid,uuid,text,timestamptz,text) to service_role;
