-- Permission/RPC alignment for strict tenant hardening.
-- Adds supplier tenant ownership, separates support from order management,
-- and introduces tenant-safe procurement + communication RPCs.

alter table public.suppliers add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
update public.suppliers set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
do $$ begin
  if exists(select 1 from public.suppliers where instance_id is null) then
    raise exception 'Tenant hardening blocked: suppliers contains rows without instance_id';
  end if;
end $$;
alter table public.suppliers alter column instance_id set not null;
drop index if exists public.suppliers_name_unique_ci;
create unique index if not exists suppliers_instance_name_unique_ci on public.suppliers(instance_id,lower(trim(name)));
create index if not exists suppliers_instance_idx on public.suppliers(instance_id,name);
alter table public.suppliers enable row level security;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='suppliers' loop
    execute format('drop policy if exists %I on public.suppliers',p.policyname);
  end loop;
end $$;

create or replace function public.can_manage_orders(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager'],p_user_id);
$$;
create or replace function public.can_manage_support(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager','support'],p_user_id);
$$;
create or replace function public.can_manage_procurement(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);
$$;

create policy suppliers_store_all on public.suppliers for all to authenticated using (public.can_manage_procurement(instance_id)) with check (public.can_manage_procurement(instance_id));
drop policy if exists purchase_orders_store_all on public.purchase_orders;
drop policy if exists purchase_order_items_store_all on public.purchase_order_items;
create policy purchase_orders_store_all on public.purchase_orders for all to authenticated using (public.can_manage_procurement(instance_id)) with check (public.can_manage_procurement(instance_id));
create policy purchase_order_items_store_all on public.purchase_order_items for all to authenticated using (public.can_manage_procurement(instance_id)) with check (public.can_manage_procurement(instance_id));
drop policy if exists support_tickets_store_all on public.support_tickets;
drop policy if exists support_ticket_messages_store_all on public.support_ticket_messages;
create policy support_tickets_store_all on public.support_tickets for all to authenticated using (public.can_manage_support(instance_id)) with check (public.can_manage_support(instance_id));
create policy support_ticket_messages_store_all on public.support_ticket_messages for all to authenticated using (public.can_manage_support(instance_id)) with check (public.can_manage_support(instance_id));

create or replace function public.has_marketing_consent_v2(p_instance_id uuid,p_email text,p_channel text default 'email') returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((select mc.status='granted' from public.marketing_consents mc where mc.instance_id=p_instance_id and lower(mc.email)=lower(trim(p_email)) and mc.channel=p_channel order by mc.occurred_at desc,mc.id desc limit 1),false);
$$;
create or replace function public.is_communication_suppressed_v2(p_instance_id uuid,p_email text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.communication_suppressions where instance_id=p_instance_id and lower(email)=lower(trim(p_email)) and active=true);
$$;
create or replace function public.enqueue_communication_v2(
  p_instance_id uuid,p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_requires_approval boolean;
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'invalid tenant'; end if;
  if p_purpose not in ('transactional','marketing') then raise exception 'invalid purpose'; end if;
  if public.is_communication_suppressed_v2(p_instance_id,p_email) then raise exception 'recipient suppressed'; end if;
  if p_purpose='marketing' and not public.has_marketing_consent_v2(p_instance_id,p_email,'email') then raise exception 'marketing consent required'; end if;
  v_requires_approval:=(p_purpose='marketing');
  insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,requires_approval,approved_at,approved_by)
  values(p_instance_id,lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at,v_requires_approval,null,null)
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_purchase_order_v2(
  p_instance_id uuid,p_order_number text,p_supplier_name text,p_payment_terms_days integer,p_expected_at date,p_payment_due_at date,p_notes text,p_created_by uuid,p_items jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_supplier_id uuid;v_supplier_name text;v_id uuid;v_total numeric(14,2);v_item jsonb;v_variant uuid;v_quantity integer;v_cost numeric(12,2);
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'Érvénytelen webshop.'; end if;
  v_supplier_name:=trim(p_supplier_name);
  if length(v_supplier_name)<2 then raise exception 'Érvénytelen beszállítónév.'; end if;
  if p_payment_terms_days<0 or p_payment_terms_days>365 then raise exception 'Érvénytelen fizetési határidő.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'A beszerzéshez legalább egy tétel szükséges.'; end if;
  select id into v_supplier_id from public.suppliers where instance_id=p_instance_id and lower(trim(name))=lower(v_supplier_name) limit 1;
  if v_supplier_id is null then
    insert into public.suppliers(instance_id,name,payment_terms_days) values(p_instance_id,v_supplier_name,p_payment_terms_days)
    on conflict(instance_id,lower(trim(name))) do update set updated_at=now() returning id into v_supplier_id;
  end if;
  select coalesce(sum((x->>'quantity')::integer*(x->>'unitCostNetHuf')::numeric),0) into v_total from jsonb_array_elements(p_items)x;
  if v_total<0 then raise exception 'Érvénytelen beszerzési összeg.'; end if;
  insert into public.purchase_orders(instance_id,order_number,supplier_id,status,expected_at,payment_due_at,net_total_huf,notes,created_by)
  values(p_instance_id,p_order_number,v_supplier_id,'draft',p_expected_at,p_payment_due_at,v_total,p_notes,p_created_by) returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_variant:=(v_item->>'variantId')::uuid;v_quantity:=(v_item->>'quantity')::integer;v_cost:=(v_item->>'unitCostNetHuf')::numeric;
    if v_quantity<=0 or v_cost<0 then raise exception 'Érvénytelen beszerzési tétel.'; end if;
    perform 1 from public.product_variants where id=v_variant and instance_id=p_instance_id;
    if not found then raise exception 'A beszerzési termékváltozat nem ehhez a webshophoz tartozik.'; end if;
    insert into public.purchase_order_items(instance_id,purchase_order_id,variant_id,quantity,unit_cost_net_huf) values(p_instance_id,v_id,v_variant,v_quantity,v_cost);
  end loop;
  return jsonb_build_object('id',v_id,'supplierId',v_supplier_id,'supplierName',v_supplier_name,'netTotal',v_total);
end $$;

create or replace function public.transition_purchase_order_v2(p_instance_id uuid,p_purchase_order_id uuid,p_target_status text,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p record;v_now timestamptz:=now();v_remaining integer;
begin
  select * into p from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.'; end if;
  if p_target_status not in ('approved','ordered','cancelled') then raise exception 'Érvénytelen célállapot.'; end if;
  if not ((p.status='draft' and p_target_status in ('approved','cancelled')) or (p.status='approved' and p_target_status in ('ordered','cancelled')) or (p.status in ('ordered','partially_received') and p_target_status='cancelled')) then raise exception 'Ez az állapotváltás nem engedélyezett.'; end if;
  if p_target_status='ordered' then
    perform 1 from public.purchase_order_items where purchase_order_id=p.id and instance_id=p_instance_id;if not found then raise exception 'Üres beszerzési rendelés nem küldhető el.';end if;
    update public.purchase_orders set status='ordered',ordered_at=coalesce(ordered_at,v_now),updated_at=v_now where id=p.id and instance_id=p_instance_id;
  elsif p_target_status='cancelled' then
    select coalesce(sum(quantity-received_quantity),0) into v_remaining from public.purchase_order_items where purchase_order_id=p.id and instance_id=p_instance_id;
    update public.purchase_orders set status='cancelled',updated_at=v_now,notes=case when p.status='partially_received' then concat_ws(E'\n',notes,'Részleges bevételezés után törölve; nyitott mennyiség: '||v_remaining||' db.') else notes end where id=p.id and instance_id=p_instance_id;
  else update public.purchase_orders set status='approved',updated_at=v_now where id=p.id and instance_id=p_instance_id;end if;
  return jsonb_build_object('previous_status',p.status,'status',p_target_status,'order_number',p.order_number);
end $$;

create or replace function public.receive_purchase_order_items_v2(p_instance_id uuid,p_purchase_order_id uuid,p_actor uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare po record;req jsonb;poi record;previous_qty integer;add_qty integer;remaining integer;received_lines integer:=0;received_units integer:=0;final_status text;
begin
  select id,order_number,status into po from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.'; end if;
  if po.status not in ('ordered','partially_received') then raise exception 'Csak megrendelt beszerzés vételezhető be.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Legalább egy bevételezendő tétel szükséges.';end if;
  for req in select value from jsonb_array_elements(p_items) loop
    add_qty:=(req->>'quantity')::integer;if add_qty<=0 then raise exception 'A bevételezett mennyiségnek pozitívnak kell lennie.';end if;
    select id,variant_id,quantity,received_quantity into poi from public.purchase_order_items where id=(req->>'itemId')::uuid and purchase_order_id=p_purchase_order_id and instance_id=p_instance_id for update;
    if not found then raise exception 'A beszerzési tétel nem található.';end if;
    if poi.received_quantity+add_qty>poi.quantity then raise exception 'A bevételezett mennyiség meghaladná a megrendelt mennyiséget.';end if;
    select stock_quantity into previous_qty from public.product_variants where id=poi.variant_id and instance_id=p_instance_id for update;if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
    update public.product_variants set stock_quantity=stock_quantity+add_qty,updated_at=now() where id=poi.variant_id and instance_id=p_instance_id;
    update public.purchase_order_items set received_quantity=received_quantity+add_qty where id=poi.id and instance_id=p_instance_id;
    insert into public.inventory_events(instance_id,variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,poi.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'purchase_order_item_id',poi.id,'received_quantity',add_qty,'partial',true));
    received_lines:=received_lines+1;received_units:=received_units+add_qty;
  end loop;
  select coalesce(sum(quantity-received_quantity),0)::integer into remaining from public.purchase_order_items where purchase_order_id=p_purchase_order_id and instance_id=p_instance_id;
  final_status:=case when remaining=0 then 'received' else 'partially_received' end;
  update public.purchase_orders set status=final_status,updated_at=now() where id=p_purchase_order_id and instance_id=p_instance_id;
  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'remaining_units',remaining,'status',final_status);
end $$;

create or replace function public.receive_purchase_order_v2(p_instance_id uuid,p_purchase_order_id uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare po record;item record;previous_qty integer;add_qty integer;received_lines integer:=0;received_units integer:=0;
begin
  select id,order_number,status into po from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.';end if;
  if po.status not in ('ordered','partially_received') then raise exception 'Csak megrendelt beszerzés vételezhető be.';end if;
  for item in select id,variant_id,quantity,received_quantity from public.purchase_order_items where purchase_order_id=p_purchase_order_id and instance_id=p_instance_id order by id for update loop
    add_qty:=item.quantity-item.received_quantity;if add_qty<=0 then continue;end if;
    select stock_quantity into previous_qty from public.product_variants where id=item.variant_id and instance_id=p_instance_id for update;if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
    update public.product_variants set stock_quantity=stock_quantity+add_qty,updated_at=now() where id=item.variant_id and instance_id=p_instance_id;
    update public.purchase_order_items set received_quantity=quantity where id=item.id and instance_id=p_instance_id;
    insert into public.inventory_events(instance_id,variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,item.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'received_quantity',add_qty));
    received_lines:=received_lines+1;received_units:=received_units+add_qty;
  end loop;
  if received_lines=0 then raise exception 'A beszerzés minden tétele már be lett vételezve.';end if;
  update public.purchase_orders set status='received',updated_at=now() where id=p_purchase_order_id and instance_id=p_instance_id;
  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'status','received');
end $$;
