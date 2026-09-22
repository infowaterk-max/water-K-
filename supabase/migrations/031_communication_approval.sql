-- V8: optional manual approval gate before provider delivery.
alter table public.communication_jobs add column if not exists requires_approval boolean not null default true;
alter table public.communication_jobs add column if not exists approved_at timestamptz;
alter table public.communication_jobs add column if not exists approved_by uuid references auth.users(id) on delete set null;

update public.communication_jobs set requires_approval=true where status='pending';

create or replace function public.claim_communication_jobs(p_limit integer default 10)
returns setof public.communication_jobs language plpgsql security definer set search_path=public as $$
begin
 return query with candidates as (
  select id from public.communication_jobs
  where status='pending' and scheduled_at<=now() and (requires_approval=false or approved_at is not null)
  order by scheduled_at,created_at for update skip locked limit greatest(1,least(p_limit,50))
 ),claimed as (
  update public.communication_jobs j set status='processing',claim_token=gen_random_uuid(),claimed_at=now(),attempts=j.attempts+1,updated_at=now() from candidates c where j.id=c.id returning j.*
 ) select * from claimed;
end $$;

create or replace function public.admin_approve_communication_job(p_job_id uuid,p_actor uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare j public.communication_jobs%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if;
 select * into j from public.communication_jobs where id=p_job_id for update;if not found then return false;end if;
 if j.status<>'pending' then raise exception 'job cannot be approved';end if;
 if j.purpose='marketing' and not public.has_marketing_consent(j.recipient_email,'email') then raise exception 'marketing consent required';end if;
 update public.communication_jobs set approved_at=now(),approved_by=p_actor,updated_at=now() where id=j.id;
 insert into public.communication_job_events(job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note) values(j.id,p_actor,'approve',j.status,j.status,j.scheduled_at,j.scheduled_at,left(p_note,1000));return true;
end $$;
revoke all on function public.admin_approve_communication_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_approve_communication_job(uuid,uuid,text) to service_role;
