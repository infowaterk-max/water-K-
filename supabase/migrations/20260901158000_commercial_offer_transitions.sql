-- Tenant-safe commercial offer approval and status transitions.
create or replace function public.approve_commercial_offer_v2(p_instance_id uuid,p_offer_id uuid) returns public.commercial_offers
language plpgsql security definer set search_path=public as $$
declare v_offer public.commercial_offers;v_preview jsonb;
begin
 select * into v_offer from public.commercial_offers where id=p_offer_id and instance_id=p_instance_id for update;
 if not found then raise exception 'offer_not_found';end if;
 if v_offer.status<>'draft' then raise exception 'offer_not_draft';end if;
 perform 1 from public.product_variants where id=v_offer.variant_id and instance_id=p_instance_id;if not found then raise exception 'variant_not_found';end if;
 select public.preview_promotion_margin(v_offer.variant_id,v_offer.discount_percent,v_offer.minimum_margin_percent) into v_preview;
 if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'margin_guard_failed';end if;
 update public.commercial_offers set status='approved',net_price_before_huf=(v_preview->>'netPriceBefore')::numeric,net_price_after_huf=(v_preview->>'netPriceAfter')::numeric,unit_cost_net_huf=(v_preview->>'unitCostNet')::numeric,margin_net_huf=(v_preview->>'marginNet')::numeric,margin_percent=(v_preview->>'marginPercent')::numeric,total_net_huf=((v_preview->>'netPriceAfter')::numeric*quantity),approved_at=now(),updated_at=now() where id=p_offer_id and instance_id=p_instance_id returning * into v_offer;
 return v_offer;
end$$;

create or replace function public.transition_commercial_offer_v2(p_instance_id uuid,p_offer_id uuid,p_status text) returns public.commercial_offers
language plpgsql security definer set search_path=public as $$
declare v public.commercial_offers;
begin
 select * into v from public.commercial_offers where id=p_offer_id and instance_id=p_instance_id for update;if not found then raise exception 'offer_not_found';end if;
 if p_status not in('sent','accepted','expired','cancelled') then raise exception 'invalid_target_status';end if;
 if p_status='sent' and v.status<>'approved' then raise exception 'offer_not_approved';end if;
 if p_status='accepted' and v.status not in('approved','sent') then raise exception 'offer_not_acceptible';end if;
 if p_status in('expired','cancelled') and v.status in('accepted','expired','cancelled') then raise exception 'offer_already_closed';end if;
 update public.commercial_offers set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end,updated_at=now() where id=p_offer_id and instance_id=p_instance_id returning * into v;
 if p_status='accepted' then
  update public.commercial_offers set status='cancelled',updated_at=now() where instance_id=p_instance_id and opportunity_id=v.opportunity_id and id<>v.id and status in('draft','approved','sent');
  update public.commercial_opportunities set status='won',closed_at=now(),updated_at=now() where instance_id=p_instance_id and id=v.opportunity_id and status in('open','in_progress');
 end if;
 return v;
end$$;
