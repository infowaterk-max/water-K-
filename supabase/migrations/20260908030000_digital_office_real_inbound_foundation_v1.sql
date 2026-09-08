-- Digital Office real inbound foundation v1.
-- Adds explicit tenant mailboxes and RFC-aware threading without touching any existing MX/domain configuration.
-- Inbound email content is stored as untrusted communication only; it never executes business actions.

create table if not exists public.office_mailboxes (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  mailbox_key text not null,
  label text not null,
  inbound_address text not null,
  provider text not null default 'resend',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mailbox_key ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  check (length(label) between 1 and 120),
  check (length(inbound_address) between 5 and 320 and position('@' in inbound_address)>1),
  check (provider in ('resend'))
);

create unique index if not exists office_mailboxes_instance_key_unique
  on public.office_mailboxes(instance_id,mailbox_key);
create unique index if not exists office_mailboxes_inbound_address_unique
  on public.office_mailboxes(lower(inbound_address));
create index if not exists office_mailboxes_instance_active_idx
  on public.office_mailboxes(instance_id,is_active,mailbox_key);

alter table public.office_mailboxes enable row level security;
revoke all on table public.office_mailboxes from anon;
revoke insert,update,delete,truncate,references,trigger on table public.office_mailboxes from authenticated;
grant select on table public.office_mailboxes to authenticated;
grant select,insert,update,delete on table public.office_mailboxes to service_role;

drop policy if exists office_mailboxes_support_read on public.office_mailboxes;
create policy office_mailboxes_support_read on public.office_mailboxes
  for select to authenticated
  using (public.can_manage_support(instance_id,(select auth.uid())));

alter table public.office_threads
  add column if not exists reply_token uuid;

update public.office_threads
set reply_token=gen_random_uuid()
where conversation_type='customer' and reply_token is null;

create unique index if not exists office_threads_instance_reply_token_unique
  on public.office_threads(instance_id,reply_token)
  where conversation_type='customer' and reply_token is not null;

create or replace function private.ensure_customer_office_reply_token_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.conversation_type='customer' then
    if new.reply_token is null then new.reply_token:=gen_random_uuid(); end if;
  else
    new.reply_token:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists office_threads_reply_token_guard on public.office_threads;
create trigger office_threads_reply_token_guard
before insert or update of conversation_type,reply_token on public.office_threads
for each row execute function private.ensure_customer_office_reply_token_v1();

revoke all on function private.ensure_customer_office_reply_token_v1() from public,anon,authenticated;

alter table public.office_messages
  add column if not exists rfc_message_id text,
  add column if not exists in_reply_to text,
  add column if not exists references_header text,
  add column if not exists attachment_count integer not null default 0;

alter table public.office_messages
  drop constraint if exists office_messages_attachment_count_check;
alter table public.office_messages
  add constraint office_messages_attachment_count_check check (attachment_count between 0 and 200);

create index if not exists office_messages_instance_rfc_message_idx
  on public.office_messages(instance_id,rfc_message_id,created_at desc)
  where rfc_message_id is not null;
create index if not exists office_messages_instance_sender_recent_idx
  on public.office_messages(instance_id,sender_email,created_at desc)
  where kind='email_in';

create or replace function public.record_inbound_office_email_v3(
  p_provider_email_id text,
  p_rfc_message_id text,
  p_sender_email text,
  p_recipient_email text,
  p_mailbox_address text,
  p_reply_token uuid,
  p_subject text,
  p_body text,
  p_in_reply_to text,
  p_references text[],
  p_attachment_count integer
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_provider_email_id text:=trim(coalesce(p_provider_email_id,''));
  v_rfc_message_id text:=nullif(trim(coalesce(p_rfc_message_id,'')),'');
  v_sender text:=lower(trim(coalesce(p_sender_email,'')));
  v_recipient text:=lower(trim(coalesce(p_recipient_email,'')));
  v_mailbox_address text:=lower(trim(coalesce(p_mailbox_address,'')));
  v_subject text:=trim(coalesce(p_subject,''));
  v_body text:=trim(coalesce(p_body,''));
  v_in_reply_to text:=nullif(trim(coalesce(p_in_reply_to,'')),'');
  v_refs text[];
  v_instance_id uuid;
  v_mailbox_key text;
  v_existing record;
  v_thread_id uuid;
  v_thread_reply_token uuid;
  v_order_id uuid;
  v_message_id uuid;
  v_match_method text:='new_thread';
  v_recent_count integer:=0;
begin
  if length(v_provider_email_id)<3 or length(v_provider_email_id)>500 then raise exception 'INBOUND_PROVIDER_EMAIL_ID_INVALID'; end if;
  if length(v_sender)<5 or length(v_sender)>320 or position('@' in v_sender)=0 then raise exception 'INBOUND_SENDER_INVALID'; end if;
  if length(v_recipient)<5 or length(v_recipient)>320 or position('@' in v_recipient)=0 then raise exception 'INBOUND_RECIPIENT_INVALID'; end if;
  if length(v_mailbox_address)<5 or length(v_mailbox_address)>320 or position('@' in v_mailbox_address)=0 then raise exception 'INBOUND_MAILBOX_INVALID'; end if;
  if length(v_subject)>300 then raise exception 'INBOUND_SUBJECT_INVALID'; end if;
  if length(v_body)<1 or length(v_body)>50000 then raise exception 'INBOUND_BODY_INVALID'; end if;
  if coalesce(p_attachment_count,0)<0 or coalesce(p_attachment_count,0)>200 then raise exception 'INBOUND_ATTACHMENT_COUNT_INVALID'; end if;
  if v_rfc_message_id is not null and length(v_rfc_message_id)>998 then raise exception 'INBOUND_RFC_MESSAGE_ID_INVALID'; end if;
  if v_in_reply_to is not null and length(v_in_reply_to)>998 then raise exception 'INBOUND_IN_REPLY_TO_INVALID'; end if;

  select array_agg(ref order by ref)
  into v_refs
  from (
    select distinct trim(x) ref
    from unnest(coalesce(p_references,array[]::text[])) x
    where length(trim(x)) between 3 and 998
    limit 50
  ) refs;

  select m.instance_id,m.mailbox_key
  into v_instance_id,v_mailbox_key
  from public.office_mailboxes m
  join public.webshop_instances w on w.id=m.instance_id
  where lower(trim(m.inbound_address))=v_mailbox_address
    and m.is_active=true
    and m.provider='resend'
    and w.status in ('pilot','active')
  limit 1;
  if not found then raise exception 'INBOUND_MAILBOX_NOT_FOUND'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_instance_id::text||':'||v_provider_email_id,0));

  select m.id,m.thread_id
  into v_existing
  from public.office_messages m
  where m.instance_id=v_instance_id
    and m.external_message_id=v_provider_email_id
  limit 1;
  if found then
    return jsonb_build_object('processed',true,'id',v_existing.id,'threadId',v_existing.thread_id,'instanceId',v_instance_id,'mailboxKey',v_mailbox_key,'duplicate',true,'matchMethod','duplicate');
  end if;

  select count(*)::integer
  into v_recent_count
  from public.office_messages m
  where m.instance_id=v_instance_id
    and m.kind='email_in'
    and lower(trim(coalesce(m.sender_email,'')))=v_sender
    and m.created_at>now()-interval '1 hour';
  if v_recent_count>=60 then
    return jsonb_build_object('processed',false,'instanceId',v_instance_id,'mailboxKey',v_mailbox_key,'duplicate',false,'reason','rate_limited');
  end if;

  -- 1) Strongest routing signal: an opaque per-thread reply token embedded in a plus-address.
  if p_reply_token is not null then
    select t.id,t.reply_token
    into v_thread_id,v_thread_reply_token
    from public.office_threads t
    where t.instance_id=v_instance_id
      and t.conversation_type='customer'
      and t.reply_token=p_reply_token
      and lower(trim(coalesce(t.customer_email,'')))=v_sender
      and (t.mailbox_key is null or t.mailbox_key=v_mailbox_key)
    limit 1
    for update;
    if found then v_match_method:='reply_token'; end if;
  end if;

  -- 2) Exact RFC In-Reply-To match. Sender and tenant/mailbox boundaries still apply.
  if v_thread_id is null and v_in_reply_to is not null then
    select t.id,t.reply_token
    into v_thread_id,v_thread_reply_token
    from public.office_messages m
    join public.office_threads t on t.id=m.thread_id and t.instance_id=m.instance_id
    where m.instance_id=v_instance_id
      and m.rfc_message_id=v_in_reply_to
      and t.conversation_type='customer'
      and lower(trim(coalesce(t.customer_email,'')))=v_sender
      and (t.mailbox_key is null or t.mailbox_key=v_mailbox_key)
    order by m.created_at desc
    limit 1
    for update of t;
    if found then v_match_method:='in_reply_to'; end if;
  end if;

  -- 3) RFC References chain, newest known referenced message first.
  if v_thread_id is null and coalesce(cardinality(v_refs),0)>0 then
    select t.id,t.reply_token
    into v_thread_id,v_thread_reply_token
    from public.office_messages m
    join public.office_threads t on t.id=m.thread_id and t.instance_id=m.instance_id
    where m.instance_id=v_instance_id
      and m.rfc_message_id=any(v_refs)
      and t.conversation_type='customer'
      and lower(trim(coalesce(t.customer_email,'')))=v_sender
      and (t.mailbox_key is null or t.mailbox_key=v_mailbox_key)
    order by m.created_at desc
    limit 1
    for update of t;
    if found then v_match_method:='references'; end if;
  end if;

  -- No sender-only fallback. An unrelated email from the same customer becomes a separate case.
  if v_thread_id is null then
    select o.id
    into v_order_id
    from public.orders o
    where o.instance_id=v_instance_id
      and lower(trim(o.customer_email))=v_sender
    order by o.created_at desc,o.id
    limit 1;

    insert into public.office_threads(
      instance_id,subject,customer_email,order_id,status,priority,conversation_type,mailbox_key,created_at,updated_at
    ) values(
      v_instance_id,case when v_subject='' then '(Nincs tárgy)' else v_subject end,v_sender,v_order_id,'open','normal','customer',v_mailbox_key,now(),now()
    ) returning id,reply_token into v_thread_id,v_thread_reply_token;
  else
    update public.office_threads
    set mailbox_key=coalesce(mailbox_key,v_mailbox_key),updated_at=now()
    where id=v_thread_id and instance_id=v_instance_id
    returning reply_token into v_thread_reply_token;
    if not found then raise exception 'INBOUND_THREAD_EVIDENCE_MISSING'; end if;
  end if;

  begin
    insert into public.office_messages(
      instance_id,thread_id,kind,body,external_message_id,sender_email,recipient_email,subject,
      rfc_message_id,in_reply_to,references_header,attachment_count
    ) values(
      v_instance_id,v_thread_id,'email_in',v_body,v_provider_email_id,v_sender,v_recipient,
      case when v_subject='' then null else v_subject end,
      v_rfc_message_id,v_in_reply_to,case when coalesce(cardinality(v_refs),0)>0 then array_to_string(v_refs,' ') else null end,
      coalesce(p_attachment_count,0)
    ) returning id into v_message_id;
  exception when unique_violation then
    select m.id,m.thread_id
    into v_message_id,v_thread_id
    from public.office_messages m
    where m.instance_id=v_instance_id and m.external_message_id=v_provider_email_id
    limit 1;
    if v_message_id is null then raise; end if;
    return jsonb_build_object('processed',true,'id',v_message_id,'threadId',v_thread_id,'instanceId',v_instance_id,'mailboxKey',v_mailbox_key,'duplicate',true,'matchMethod','duplicate');
  end;

  update public.office_threads set updated_at=now()
  where id=v_thread_id and instance_id=v_instance_id;
  if not found or v_message_id is null then raise exception 'INBOUND_MESSAGE_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'processed',true,'id',v_message_id,'threadId',v_thread_id,'instanceId',v_instance_id,'mailboxKey',v_mailbox_key,
    'replyToken',v_thread_reply_token,'duplicate',false,'matchMethod',v_match_method
  );
end;
$$;

revoke all on function public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)
from public,anon,authenticated;
grant execute on function public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)
to service_role;

-- Retire the sender-only v2 mutation path so new code cannot accidentally reintroduce cross-topic merges.
revoke all on function public.record_inbound_office_email_v2(text,text,text,text,text)
from public,anon,authenticated,service_role;

comment on function public.record_inbound_office_email_v3(text,text,text,text,text,uuid,text,text,text,text[],integer)
is 'Atomically persists an untrusted inbound email using tenant mailbox + reply token/RFC threading. Never matches by sender alone and never performs business actions.';
