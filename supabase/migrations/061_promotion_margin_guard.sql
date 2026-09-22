-- V9 promotion margin guard.
-- Prevents planned percentage promotions from crossing a configurable net margin floor.
create or replace function public.preview_promotion_margin(
  p_variant_id uuid,
  p_discount_percent numeric,
  p_min_margin_percent numeric default 20
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v record;
  v_discount numeric;
  v_net_after numeric;
  v_margin numeric;
  v_margin_pct numeric;
  v_safe boolean;
begin
  if p_discount_percent < 0 or p_discount_percent > 100 then raise exception 'invalid discount percent'; end if;
  if p_min_margin_percent < 0 or p_min_margin_percent > 100 then raise exception 'invalid minimum margin percent'; end if;
  select id,sku,label,net_price_huf,unit_cost_net_huf into v from public.product_variants where id=p_variant_id;
  if not found then raise exception 'variant not found'; end if;
  if v.unit_cost_net_huf is null then
    return jsonb_build_object('safe',false,'reason','missing_unit_cost','variantId',v.id,'sku',v.sku);
  end if;
  v_discount:=v.net_price_huf*(p_discount_percent/100);
  v_net_after:=greatest(0,v.net_price_huf-v_discount);
  v_margin:=v_net_after-v.unit_cost_net_huf;
  v_margin_pct:=case when v_net_after>0 then (v_margin/v_net_after)*100 else -100 end;
  v_safe:=v_margin>=0 and v_margin_pct>=p_min_margin_percent;
  return jsonb_build_object(
    'safe',v_safe,'variantId',v.id,'sku',v.sku,'label',v.label,
    'discountPercent',round(p_discount_percent,2),'netPriceBefore',v.net_price_huf,
    'netPriceAfter',round(v_net_after,2),'unitCostNet',v.unit_cost_net_huf,
    'marginNet',round(v_margin,2),'marginPercent',round(v_margin_pct,2),
    'minimumMarginPercent',round(p_min_margin_percent,2)
  );
end;$$;
revoke all on function public.preview_promotion_margin(uuid,numeric,numeric) from public,anon,authenticated;
grant execute on function public.preview_promotion_margin(uuid,numeric,numeric) to service_role;
comment on function public.preview_promotion_margin(uuid,numeric,numeric) is 'V9 decision guard for planned percentage promotions using current net price and net unit cost.';