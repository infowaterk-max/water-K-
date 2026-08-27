-- V10 audit fix: govern offer creation and sibling lifecycle at DB level
create or replace function public.create_commercial_offer(
  p_opportunity_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_discount_percent numeric,
  p_minimum_margin_percent numeric,
  p_created_by uuid
)
returns public.commercial_offers
language plpgsql security definer set search_path=''
as $$
declare v_opp public.commercial_opportunities; v public.commercial_offers;begin
 if p_quantity<=0 then raise exception 'invalid_quantity'; end if;
 if p_discount_percent<0 or p_discount_percent>100 then raise exception 'invalid_discount'; end if;
 if p_minimum_margin_percent<0 or p_minimum_margin_percent>100 then raise exception 'invalid_minimum_margin'; end if;
 select * into v_opp from public.commercial_opportunities where id=p_opportunity_id for update;
 if not found then raise exception 'opportunity_not_found'; end if;
 if v_opp.status not in ('open','in_progress') then raise exception 'opportunity_closed'; end if;
 insert into public.commercial_offers(opportunity_id,variant_id,quantity,discount_percent,minimum_margin_percent,created_by)
 values(p_opportunity_id,p_variant_id,p_quantity,p_discount_percent,p_minimum_margin_percent,p_created_by)
 returning * into v;
 update public.commercial_opportunities set status='in_progress',updated_at=now() where id=p_opportunity_id and status='open';
 return v;
end;$$;
revoke all on function public.create_commercial_offer(uuid,uuid,integer,numeric,numeric,uuid) from public,anon,authenticated;
grant execute on function public.create_commercial_offer(uuid,uuid,integer,numeric,numeric,uuid) to service_role;

create or replace function public.transition_commercial_offer(p_offer_id uuid,p_status text)
returns public.commercial_offers
language plpgsql security definer set search_path=''
as $$
declare v public.commercial_offers;begin
 select * into v from public.commercial_offers where id=p_offer_id for update;
 if not found then raise exception 'offer_not_found'; end if;
 if p_status not in ('sent','accepted','expired','cancelled') then raise exception 'invalid_target_status'; end if;
 if p_status='sent' and v.status<>'approved' then raise exception 'offer_not_approved'; end if;
 if p_status='accepted' and v.status not in ('approved','sent') then raise exception 'offer_not_acceptible'; end if;
 if p_status in ('expired','cancelled') and v.status in ('accepted','expired','cancelled') then raise exception 'offer_already_closed'; end if;
 update public.commercial_offers set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end,updated_at=now() where id=p_offer_id returning * into v;
 if p_status='accepted' then
   update public.commercial_offers set status='cancelled',updated_at=now()
    where opportunity_id=v.opportunity_id and id<>v.id and status in ('draft','approved','sent');
   update public.commercial_opportunities set status='won',closed_at=now(),updated_at=now() where id=v.opportunity_id and status in ('open','in_progress');
 end if;
 return v;
end;$$;
revoke all on function public.transition_commercial_offer(uuid,text) from public,anon,authenticated;
grant execute on function public.transition_commercial_offer(uuid,text) to service_role;
