-- V10: governed offer lifecycle and opportunity linkage
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
 update public.commercial_offers set status=p_status,sent_at=case when p_status='sent' then now() else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end,updated_at=now() where id=p_offer_id returning * into v;
 if p_status='accepted' then update public.commercial_opportunities set status='won',closed_at=now(),updated_at=now() where id=v.opportunity_id and status in ('open','in_progress'); end if;
 return v;
end;$$;
revoke all on function public.transition_commercial_offer(uuid,text) from public,anon,authenticated;grant execute on function public.transition_commercial_offer(uuid,text) to service_role;

create or replace view public.commercial_offer_forecast with(security_invoker=true) as
select o.channel,
 count(f.id) filter(where f.status in ('approved','sent')) as active_offer_count,
 coalesce(sum(f.total_net_huf) filter(where f.status in ('approved','sent')),0) as active_offer_net_huf,
 coalesce(sum(f.total_net_huf * o.probability_percent / 100) filter(where f.status in ('approved','sent')),0) as weighted_offer_net_huf,
 count(f.id) filter(where f.status='accepted') as accepted_offer_count,
 coalesce(sum(f.total_net_huf) filter(where f.status='accepted'),0) as accepted_offer_net_huf
from public.commercial_opportunities o join public.commercial_offers f on f.opportunity_id=o.id group by o.channel;
revoke all on public.commercial_offer_forecast from public,anon,authenticated;grant select on public.commercial_offer_forecast to service_role;
