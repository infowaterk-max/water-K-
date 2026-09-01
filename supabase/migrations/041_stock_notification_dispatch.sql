alter table public.stock_notifications drop constraint if exists stock_notifications_status_check;
alter table public.stock_notifications add constraint stock_notifications_status_check check(status in ('waiting','queued','sent','cancelled'));
alter table public.stock_notifications add column if not exists communication_job_id uuid references public.communication_jobs(id) on delete set null;
create unique index if not exists stock_notifications_communication_job_uidx on public.stock_notifications(communication_job_id) where communication_job_id is not null;
create index if not exists stock_notifications_user_id_idx on public.stock_notifications(user_id);

create or replace function public.queue_available_stock_notifications(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare r record; v_job_id uuid; v_count integer:=0;
begin
  for r in
    select sn.id,sn.variant_id,sn.user_id,sn.email,p.name as product_name,p.slug,pv.label
    from public.stock_notifications sn
    join public.product_variants pv on pv.id=sn.variant_id
    join public.products p on p.id=pv.product_id
    where sn.status='waiting' and pv.active=true and pv.stock_quantity>0 and p.active=true
    order by sn.created_at
    for update of sn skip locked
    limit greatest(1,least(coalesce(p_limit,50),200))
  loop
    insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(lower(r.email),r.user_id,'transactional','stock_available',jsonb_build_object('productName',r.product_name,'variantLabel',r.label,'productUrl','/termek/'||r.slug,'stockNotificationId',r.id),'stock-notification:'||r.id::text,false,now())
    on conflict(idempotency_key) do update set updated_at=now()
    returning id into v_job_id;
    update public.stock_notifications set status='queued',communication_job_id=v_job_id where id=r.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;$$;
revoke all on function public.queue_available_stock_notifications(integer) from public,anon,authenticated;
grant execute on function public.queue_available_stock_notifications(integer) to service_role;
