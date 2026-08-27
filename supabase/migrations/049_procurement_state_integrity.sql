create or replace function public.transition_purchase_order(p_purchase_order_id uuid,p_target_status text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p record;v_now timestamptz:=now();v_remaining integer;begin
 select * into p from public.purchase_orders where id=p_purchase_order_id for update;
 if not found then raise exception 'A beszerzés nem található.'; end if;
 if p_target_status not in ('approved','ordered','cancelled') then raise exception 'Érvénytelen célállapot.'; end if;
 if not ((p.status='draft' and p_target_status in ('approved','cancelled')) or (p.status='approved' and p_target_status in ('ordered','cancelled')) or (p.status in ('ordered','partially_received') and p_target_status='cancelled')) then raise exception 'Ez az állapotváltás nem engedélyezett.'; end if;
 if p_target_status='ordered' then
  perform 1 from public.purchase_order_items where purchase_order_id=p.id;
  if not found then raise exception 'Üres beszerzési rendelés nem küldhető el.'; end if;
  update public.purchase_orders set status='ordered',ordered_at=coalesce(ordered_at,v_now),updated_at=v_now where id=p.id;
 elsif p_target_status='cancelled' then
  select coalesce(sum(quantity-received_quantity),0) into v_remaining from public.purchase_order_items where purchase_order_id=p.id;
  update public.purchase_orders set status='cancelled',updated_at=v_now,notes=case when p.status='partially_received' then concat_ws(E'\n',notes,'Részleges bevételezés után törölve; nyitott mennyiség: '||v_remaining||' db.') else notes end where id=p.id;
 else
  update public.purchase_orders set status='approved',updated_at=v_now where id=p.id;
 end if;
 return jsonb_build_object('previous_status',p.status,'status',p_target_status,'order_number',p.order_number);
end;$$;
revoke all on function public.transition_purchase_order(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.transition_purchase_order(uuid,text,uuid) to service_role;
