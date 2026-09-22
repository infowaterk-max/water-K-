-- Public support submission concurrency/evidence closure.
-- Dedupe check, optional order link, ticket insert and initial-message trigger commit together.

create or replace function public.create_support_ticket_v2(
  p_instance_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_order_number text,
  p_category text,
  p_subject text,
  p_message text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_name text:=nullif(trim(coalesce(p_name,'')),'');
  v_order_number text:=nullif(trim(coalesce(p_order_number,'')),'');
  v_subject text:=trim(coalesce(p_subject,''));
  v_message text:=trim(coalesce(p_message,''));
  v_order record;
  v_order_id uuid;
  v_recent record;
  v_ticket_id uuid;
  v_ticket_number text;
  v_try integer;
begin
  if p_instance_id is null then raise exception 'SUPPORT_INSTANCE_REQUIRED'; end if;
  if not exists(
    select 1 from public.webshop_instances
    where id=p_instance_id and status in ('pilot','active')
  ) then raise exception 'SUPPORT_STORE_INACTIVE'; end if;
  if length(v_email)<5 or length(v_email)>200 or position('@' in v_email)=0 then raise exception 'SUPPORT_EMAIL_INVALID'; end if;
  if v_name is not null and length(v_name)>120 then raise exception 'SUPPORT_NAME_INVALID'; end if;
  if p_category not in ('product','order','shipping','invoice','reseller','return','other') then raise exception 'SUPPORT_CATEGORY_INVALID'; end if;
  if length(v_subject)<3 or length(v_subject)>180 then raise exception 'SUPPORT_SUBJECT_INVALID'; end if;
  if length(v_message)<10 or length(v_message)>4000 then raise exception 'SUPPORT_MESSAGE_INVALID'; end if;

  if p_user_id is not null and not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'SUPPORT_USER_NOT_FOUND';
  end if;

  -- Serializes the semantic 5-minute duplicate window for the same store, sender and subject.
  perform pg_advisory_xact_lock(hashtextextended(p_instance_id::text||':'||v_email||':'||lower(v_subject),0));

  if v_order_number is not null then
    select o.id,o.customer_id,o.customer_email
    into v_order
    from public.orders o
    where o.instance_id=p_instance_id and o.order_number=v_order_number
    limit 1;
    if found and (
      lower(trim(v_order.customer_email))=v_email
      or (p_user_id is not null and v_order.customer_id=p_user_id)
    ) then
      v_order_id:=v_order.id;
    end if;
  end if;

  select t.id,t.ticket_number
  into v_recent
  from public.support_tickets t
  where t.instance_id=p_instance_id
    and lower(trim(t.email))=v_email
    and t.subject=v_subject
    and t.created_at>=now()-interval '5 minutes'
  order by t.created_at desc,t.id
  limit 1;
  if found then
    return jsonb_build_object(
      'id',v_recent.id,
      'ticketNumber',v_recent.ticket_number,
      'instanceId',p_instance_id,
      'duplicate',true
    );
  end if;

  for v_try in 1..3 loop
    v_ticket_number:='SUP-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    begin
      insert into public.support_tickets(
        instance_id,ticket_number,user_id,order_id,email,name,category,subject,message
      ) values(
        p_instance_id,v_ticket_number,p_user_id,v_order_id,v_email,v_name,
        p_category::public.support_ticket_category,v_subject,v_message
      )
      returning id into v_ticket_id;
      exit;
    exception when unique_violation then
      if v_try=3 then raise exception 'SUPPORT_TICKET_NUMBER_COLLISION'; end if;
    end;
  end loop;

  if v_ticket_id is null then raise exception 'SUPPORT_TICKET_EVIDENCE_MISSING'; end if;
  if not exists(
    select 1 from public.support_ticket_messages
    where instance_id=p_instance_id and ticket_id=v_ticket_id
  ) then raise exception 'SUPPORT_INITIAL_MESSAGE_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'id',v_ticket_id,
    'ticketNumber',v_ticket_number,
    'instanceId',p_instance_id,
    'orderId',v_order_id,
    'duplicate',false
  );
end;
$$;

revoke all on function public.create_support_ticket_v2(uuid,uuid,text,text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.create_support_ticket_v2(uuid,uuid,text,text,text,text,text,text)
to service_role;

comment on function public.create_support_ticket_v2(uuid,uuid,text,text,text,text,text,text)
is 'Atomically deduplicates public support submissions, resolves a tenant-owned order link, inserts the ticket and verifies its trigger-created initial message.';
