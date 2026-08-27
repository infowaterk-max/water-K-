create or replace function public.transition_return_case(
  p_case_id uuid,
  p_actor uuid,
  p_target_status text,
  p_refund_amount integer,
  p_refund_reference text,
  p_admin_note text,
  p_restock boolean default false
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  c record;
  o record;
  v_now timestamptz:=now();
  v_previous_refunds integer:=0;
  v_total_refunded integer:=0;
  v_restock jsonb:=null;
  v_allowed boolean:=false;
begin
  select * into c from public.return_cases where id=p_case_id for update;
  if not found then raise exception 'Az ügy nem található.'; end if;

  if p_target_status not in ('requested','approved','rejected','received','refund_pending','refunded','closed') then
    raise exception 'Érvénytelen visszáru állapot.';
  end if;

  v_allowed := p_target_status=c.status
    or (c.status='requested' and p_target_status in ('approved','rejected'))
    or (c.status='approved' and p_target_status in ('received','closed'))
    or (c.status='rejected' and p_target_status='closed')
    or (c.status='received' and p_target_status in ('refund_pending','refunded','closed'))
    or (c.status='refund_pending' and p_target_status in ('refunded','closed'))
    or (c.status='refunded' and p_target_status='closed');
  if not v_allowed then
    raise exception 'Érvénytelen állapotváltás: % → %.',c.status,p_target_status;
  end if;

  select id,total_gross_huf,status into o from public.orders where id=c.order_id for update;
  if not found then raise exception 'A kapcsolódó rendelés nem található.'; end if;

  if p_refund_amount is not null and (p_refund_amount<0 or p_refund_amount>o.total_gross_huf) then
    raise exception 'A visszatérítés összege nem lehet nagyobb a rendelés teljes összegénél.';
  end if;
  if p_target_status='refunded' and p_refund_amount is null then
    raise exception 'A visszatérített állapothoz add meg a visszatérítés összegét.';
  end if;

  if p_target_status='refunded' then
    select coalesce(sum(refund_amount_gross_huf),0)::integer into v_previous_refunds
    from public.return_cases
    where order_id=c.order_id and status='refunded' and id<>c.id;
    if v_previous_refunds+p_refund_amount>o.total_gross_huf then
      raise exception 'A korábbi visszatérítésekkel együtt legfeljebb % Ft téríthető még vissza ehhez a rendeléshez.',greatest(0,o.total_gross_huf-v_previous_refunds);
    end if;
  end if;

  update public.return_cases set
    status=p_target_status::public.return_case_status,
    refund_amount_gross_huf=p_refund_amount,
    refund_reference=nullif(trim(p_refund_reference),''),
    admin_note=nullif(trim(p_admin_note),''),
    approved_at=case when p_target_status='approved' then coalesce(approved_at,v_now) else approved_at end,
    received_at=case when p_target_status='received' then coalesce(received_at,v_now) else received_at end,
    refunded_at=case when p_target_status='refunded' then coalesce(refunded_at,v_now) else refunded_at end,
    closed_at=case when p_target_status='closed' then coalesce(closed_at,v_now) else closed_at end,
    updated_at=v_now
  where id=c.id;

  if p_restock then
    if p_target_status not in ('received','refund_pending','refunded','closed') then
      raise exception 'Készletre csak visszaérkezett termék tehető.';
    end if;
    select public.restock_return_case(c.id,p_actor) into v_restock;
  end if;

  if p_target_status='refunded' then
    select coalesce(sum(refund_amount_gross_huf),0)::integer into v_total_refunded
    from public.return_cases where order_id=c.order_id and status='refunded';
    if v_total_refunded>=o.total_gross_huf and o.status<>'refunded' then
      update public.orders set status='refunded',updated_at=v_now where id=o.id;
    end if;
  end if;

  return jsonb_build_object(
    'previous_status',c.status,
    'status',p_target_status,
    'refund_amount_gross_huf',p_refund_amount,
    'refund_reference',nullif(trim(p_refund_reference),''),
    'admin_note',nullif(trim(p_admin_note),''),
    'restock',v_restock
  );
end;$$;

revoke all on function public.transition_return_case(uuid,uuid,text,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.transition_return_case(uuid,uuid,text,integer,text,text,boolean) to service_role;
