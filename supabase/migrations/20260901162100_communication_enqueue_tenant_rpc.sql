-- Tenant-aware communication enqueue for merchant follow-up. Server/service-role only.
alter table public.communication_jobs drop constraint if exists communication_jobs_idempotency_key_key;
create unique index if not exists communication_jobs_instance_idempotency_uidx on public.communication_jobs(instance_id,idempotency_key);

create or replace function public.enqueue_communication_v2(
 p_instance_id uuid,p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_consent text;v_requires_approval boolean;
begin
 if p_instance_id is null then raise exception 'instance_id required';end if;
 if p_purpose not in('transactional','marketing') then raise exception 'invalid purpose';end if;
 if exists(select 1 from public.communication_suppressions s where s.instance_id=p_instance_id and lower(s.email)=lower(trim(p_email)) and s.active=true) then raise exception 'recipient suppressed';end if;
 if p_purpose='marketing' then
  select c.status into v_consent from public.marketing_consents c where c.instance_id=p_instance_id and lower(c.email)=lower(trim(p_email)) and c.channel='email' order by c.occurred_at desc limit 1;
  if v_consent is distinct from 'granted' then raise exception 'marketing consent required';end if;
 end if;
 v_requires_approval:=p_purpose='marketing';
 insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,requires_approval,approved_at,approved_by)
 values(p_instance_id,lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at,v_requires_approval,null,null)
 on conflict(instance_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_id;
 return v_id;
end$$;
revoke all on function public.enqueue_communication_v2(uuid,text,uuid,text,text,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_communication_v2(uuid,text,uuid,text,text,jsonb,text,timestamptz) to service_role;
