-- V8: conservative post-send campaign conversion attribution.
-- Attribution: same normalized email, paid/processing/completed order, created after message sent,
-- within 30 days, and assigned to the most recent eligible campaign send before the order.
create or replace view public.marketing_campaign_conversions as
with sends as (
 select r.campaign_id,r.id recipient_id,lower(r.email) email,j.sent_at
 from public.marketing_campaign_recipients r
 join public.communication_jobs j on j.id=r.communication_job_id
 where j.status='sent' and j.sent_at is not null
), candidates as (
 select s.campaign_id,s.recipient_id,o.id order_id,o.order_number,o.total_gross_huf,o.created_at order_created_at,s.sent_at,
 row_number() over(partition by o.id order by s.sent_at desc) rn
 from sends s join public.orders o on lower(o.customer_email)=s.email
 where o.status in('paid','processing','completed') and o.created_at>=s.sent_at and o.created_at<s.sent_at+interval '30 days'
)
select campaign_id,recipient_id,order_id,order_number,total_gross_huf,order_created_at,sent_at,
 extract(epoch from(order_created_at-sent_at))/86400.0 days_to_conversion
from candidates where rn=1;
revoke all on public.marketing_campaign_conversions from anon,authenticated;grant select on public.marketing_campaign_conversions to service_role;
