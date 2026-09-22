-- Tenant-safe customer returns plus internal SECURITY DEFINER surface lockdown.

create or replace function public.create_return_case_v2(
  p_instance_id uuid,
  p_order_id uuid,
  p_user_id uuid,
  p_customer_email text,
  p_reason text,
  p_customer_note text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_case_id uuid;
  v_order record;
  v_item jsonb;
  v_order_item record;
  v_qty integer;
  v_open_case uuid;
begin
  if p_instance_id is null or p_user_id is null then
    raise exception 'A visszaküldési kérelem azonosítója hiányos.';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy visszaküldendő tétel szükséges.';
  end if;
  if jsonb_array_length(p_items)>30 then
    raise exception 'Túl sok visszaküldendő tétel.';
  end if;

  select id,instance_id,customer_id,customer_email,status
  into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id and customer_id=p_user_id
  for update;

  if not found then
    raise exception 'A rendelés nem található ebben a webshopban.';
  end if;
  if v_order.status not in('shipped','completed') then
    raise exception 'Ehhez a rendeléshez jelenleg nem indítható visszaküldési kérelem.';
  end if;

  select id into v_open_case
  from public.return_cases
  where instance_id=p_instance_id
    and order_id=p_order_id
    and user_id=p_user_id
    and status in('requested','approved','received','refund_pending')
  limit 1
  for update;

  if v_open_case is not null then
    raise exception 'Ehhez a rendeléshez már van folyamatban lévő ügy.';
  end if;

  insert into public.return_cases(
    instance_id,order_id,user_id,customer_email,reason,customer_note
  ) values(
    p_instance_id,p_order_id,p_user_id,
    coalesce(nullif(trim(p_customer_email),''),v_order.customer_email),
    p_reason,nullif(trim(p_customer_note),'')
  )
  returning id into v_case_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty:=(v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Érvénytelen visszaküldési mennyiség.';
    end;
    if v_qty<=0 then raise exception 'Érvénytelen visszaküldési mennyiség.'; end if;

    select id,instance_id,order_id,quantity
    into v_order_item
    from public.order_items
    where id=(v_item->>'orderItemId')::uuid
      and instance_id=p_instance_id;

    if not found or v_order_item.order_id<>p_order_id or v_qty>v_order_item.quantity then
      raise exception 'Érvénytelen visszaküldési tétel vagy mennyiség.';
    end if;

    insert into public.return_case_items(
      instance_id,return_case_id,order_item_id,quantity
    ) values(
      p_instance_id,v_case_id,v_order_item.id,v_qty
    );
  end loop;

  return v_case_id;
end;
$$;

revoke all on function public.create_return_case_v2(uuid,uuid,uuid,text,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.create_return_case_v2(uuid,uuid,uuid,text,text,text,jsonb)
  to service_role;

create or replace function public.validate_refund_total()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_total integer;
  v_other_refunded integer;
begin
  select total_gross_huf into v_order_total
  from public.orders
  where id=new.order_id and instance_id=new.instance_id;

  if not found then
    raise exception 'Cross-store refund relation is not allowed.';
  end if;

  if new.refund_amount_gross_huf is not null
     and new.refund_amount_gross_huf>coalesce(v_order_total,0) then
    raise exception 'A visszatérítés nem lehet nagyobb a rendelés értékénél.';
  end if;

  if new.status='refunded' then
    if new.refund_amount_gross_huf is null then
      raise exception 'A visszatérített állapothoz visszatérítési összeg szükséges.';
    end if;
    select coalesce(sum(refund_amount_gross_huf),0) into v_other_refunded
    from public.return_cases
    where instance_id=new.instance_id
      and order_id=new.order_id
      and status='refunded'
      and id<>new.id;

    if v_other_refunded+new.refund_amount_gross_huf>coalesce(v_order_total,0) then
      raise exception 'A visszatérítések összege meghaladná a rendelés teljes értékét.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_return_case_item_quantity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_item record;
  v_case record;
  v_already integer;
begin
  select id,instance_id,order_id,quantity into v_order_item
  from public.order_items
  where id=new.order_item_id and instance_id=new.instance_id;
  if not found then raise exception 'A rendelési tétel nem található ebben a webshopban.'; end if;

  select id,instance_id,order_id,status into v_case
  from public.return_cases
  where id=new.return_case_id and instance_id=new.instance_id;
  if not found then raise exception 'A visszáru ügy nem található ebben a webshopban.'; end if;

  if v_case.order_id<>v_order_item.order_id then
    raise exception 'A visszáru tétel nem ehhez a rendeléshez tartozik.';
  end if;

  select coalesce(sum(rci.quantity),0) into v_already
  from public.return_case_items rci
  join public.return_cases rc
    on rc.id=rci.return_case_id
   and rc.instance_id=rci.instance_id
  where rci.instance_id=new.instance_id
    and rci.order_item_id=new.order_item_id
    and rc.status<>'rejected'
    and (tg_op='INSERT' or rci.id<>new.id);

  if v_already+new.quantity>v_order_item.quantity then
    raise exception 'A visszaküldött összmennyiség meghaladná a megvásárolt mennyiséget.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_order_status_against_operations()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_op text;
begin
  if new.status is not distinct from old.status then return new; end if;

  select operational_status into v_op
  from public.order_operations
  where order_id=new.id and instance_id=new.instance_id;

  if new.status='cancelled' and v_op in('handed_over','delivered') then
    raise exception 'A futárnak átadott vagy kézbesített rendelés nem törölhető; használj visszáru/visszatérítés folyamatot.';
  end if;
  if old.status='completed' and new.status not in('completed','refunded') then
    raise exception 'A teljesített rendelés kereskedelmi állapota nem állítható vissza.';
  end if;
  if old.status='shipped' and new.status in('draft','pending','paid','processing') then
    raise exception 'A feladott rendelés nem állítható vissza feldolgozási állapotba.';
  end if;
  return new;
end;
$$;

-- Legacy global customer-return RPC is no longer a valid runtime entry point.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='create_return_case'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;

-- Trigger functions execute through their table triggers and must never be callable
-- directly through the Data API. Revoke the exposed function surface comprehensively.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    join pg_type t on t.oid=p.prorettype
    where n.nspname='public'
      and t.typname='trigger'
      and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature);
  end loop;
end $$;

-- Server-only SECURITY DEFINER helpers keep service-role access only.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname=any(array[
        'allow_stock_notification_request',
        'consume_security_rate_limit',
        'preview_promotion_margin',
        'record_observability_event'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
