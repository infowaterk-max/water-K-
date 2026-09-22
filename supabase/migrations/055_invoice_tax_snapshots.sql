alter table public.order_items
  add column if not exists unit_net_huf_snapshot integer,
  add column if not exists line_total_net_huf_snapshot integer,
  add column if not exists vat_rate_percent_snapshot numeric(6,3);

create or replace function private.snapshot_order_item_tax()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v record;
  v_net integer;
begin
  if new.variant_id is null then return new; end if;
  select gross_price_huf,net_price_huf,reseller_gross_price_huf,reseller_net_price_huf
  into v from public.product_variants where id=new.variant_id;
  if not found then return new; end if;
  v_net:=case
    when v.reseller_gross_price_huf is not null and v.reseller_net_price_huf is not null and new.unit_gross_huf=v.reseller_gross_price_huf then v.reseller_net_price_huf
    when new.unit_gross_huf=v.gross_price_huf then v.net_price_huf
    else null end;
  if v_net is not null and v_net>0 then
    new.unit_net_huf_snapshot:=v_net;
    new.line_total_net_huf_snapshot:=v_net*new.quantity;
    new.vat_rate_percent_snapshot:=round(((new.unit_gross_huf::numeric/v_net::numeric)-1)*100,3);
  end if;
  return new;
end;$$;

revoke all on function private.snapshot_order_item_tax() from public,anon,authenticated;
drop trigger if exists trg_snapshot_order_item_tax on public.order_items;
create trigger trg_snapshot_order_item_tax before insert on public.order_items for each row execute function private.snapshot_order_item_tax();

update public.order_items oi set
  unit_net_huf_snapshot=case when pv.reseller_gross_price_huf is not null and pv.reseller_net_price_huf is not null and oi.unit_gross_huf=pv.reseller_gross_price_huf then pv.reseller_net_price_huf when oi.unit_gross_huf=pv.gross_price_huf then pv.net_price_huf else null end,
  line_total_net_huf_snapshot=(case when pv.reseller_gross_price_huf is not null and pv.reseller_net_price_huf is not null and oi.unit_gross_huf=pv.reseller_gross_price_huf then pv.reseller_net_price_huf when oi.unit_gross_huf=pv.gross_price_huf then pv.net_price_huf else null end)*oi.quantity,
  vat_rate_percent_snapshot=case when (case when pv.reseller_gross_price_huf is not null and pv.reseller_net_price_huf is not null and oi.unit_gross_huf=pv.reseller_gross_price_huf then pv.reseller_net_price_huf when oi.unit_gross_huf=pv.gross_price_huf then pv.net_price_huf else null end)>0 then round(((oi.unit_gross_huf::numeric/(case when pv.reseller_gross_price_huf is not null and pv.reseller_net_price_huf is not null and oi.unit_gross_huf=pv.reseller_gross_price_huf then pv.reseller_net_price_huf when oi.unit_gross_huf=pv.gross_price_huf then pv.net_price_huf else null end)::numeric)-1)*100,3) else null end
from public.product_variants pv
where pv.id=oi.variant_id and oi.unit_net_huf_snapshot is null;
