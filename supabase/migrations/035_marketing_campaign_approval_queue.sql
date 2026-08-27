-- V8: audited campaign approval and safe communication queue creation.
create table if not exists public.marketing_campaign_events(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,actor_user_id uuid references auth.users(id) on delete set null,action text not null check(action in('submit_review','approve','queue','cancel')),note text,created_at timestamptz not null default now()
);
alter table public.marketing_campaign_events enable row level security;revoke all on public.marketing_campaign_events from anon,authenticated;grant select,insert on public.marketing_campaign_events to service_role;
create or replace function public.admin_manage_marketing_campaign(p_campaign_id uuid,p_actor uuid,p_action text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.marketing_campaigns%rowtype;r record;v_job uuid;v_queued integer:=0;begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if;select * into c from public.marketing_campaigns where id=p_campaign_id for update;if not found then raise exception 'campaign not found';end if;
 if p_action='submit_review' then if c.status<>'draft' then raise exception 'invalid state';end if;update public.marketing_campaigns set status='review',updated_at=now() where id=c.id;
 elsif p_action='approve' then if c.status<>'review' then raise exception 'invalid state';end if;update public.marketing_campaigns set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now() where id=c.id;
 elsif p_action='queue' then if c.status<>'approved' then raise exception 'invalid state';end if;
  for r in select * from public.marketing_campaign_recipients where campaign_id=c.id and eligible=true and communication_job_id is null loop
   if public.has_marketing_consent(r.email,'email') and not public.is_communication_suppressed(r.email) then
    begin v_job:=public.enqueue_communication(r.email,r.user_id,'marketing',c.template_key,jsonb_build_object('customerName',coalesce(r.customer_name,''),'campaignId',c.id),concat('campaign:',c.id,':',lower(r.email)),coalesce(c.scheduled_at,now()));update public.marketing_campaign_recipients set communication_job_id=v_job where id=r.id;v_queued:=v_queued+1;exception when others then null;end;
   else update public.marketing_campaign_recipients set eligible=false,exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE' where id=r.id;end if;
  end loop;update public.marketing_campaigns set status='queued',updated_at=now() where id=c.id;
 elsif p_action='cancel' then if c.status in('queued','completed','cancelled') then raise exception 'invalid state';end if;update public.marketing_campaigns set status='cancelled',updated_at=now() where id=c.id;
 else raise exception 'invalid action';end if;
 insert into public.marketing_campaign_events(campaign_id,actor_user_id,action,note) values(c.id,p_actor,p_action,left(p_note,1000));return jsonb_build_object('ok',true,'queued',v_queued);end $$;
revoke all on function public.admin_manage_marketing_campaign(uuid,uuid,text,text) from public,anon,authenticated;grant execute on function public.admin_manage_marketing_campaign(uuid,uuid,text,text) to service_role;
