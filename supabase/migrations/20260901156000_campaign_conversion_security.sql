-- Security-advisor and attribution hardening for campaign conversion reporting.
-- Preserve existing view column order and append instance_id for tenant filtering.

create or replace view public.marketing_campaign_conversions
with (security_invoker=true) as
with sends as (
  select r.instance_id,r.campaign_id,r.id as recipient_id,lower(r.email) as email,j.sent_at
  from public.marketing_campaign_recipients r
  join public.communication_jobs j on j.id=r.communication_job_id and j.instance_id=r.instance_id
  where j.status='sent' and j.sent_at is not null
), candidates as (
  select s.instance_id,s.campaign_id,s.recipient_id,o.id as order_id,o.order_number,o.total_gross_huf,
         o.created_at as order_created_at,s.sent_at,
         row_number() over(partition by o.instance_id,o.id order by s.sent_at desc) as rn
  from sends s
  join public.orders o on o.instance_id=s.instance_id and lower(o.customer_email)=s.email
  where o.status in ('paid','processing','completed')
    and o.created_at>=s.sent_at
    and o.created_at<s.sent_at+interval '30 days'
)
select campaign_id,recipient_id,order_id,order_number,total_gross_huf,order_created_at,sent_at,
       extract(epoch from order_created_at-sent_at)/86400.0 as days_to_conversion,instance_id
from candidates where rn=1;

comment on view public.marketing_campaign_conversions is 'Tenant-safe campaign conversion attribution; security_invoker preserves underlying RLS.';
