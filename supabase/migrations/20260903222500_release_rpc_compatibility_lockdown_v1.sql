-- Finalize the zero-downtime RPC transition after the new application deployment is READY.
-- Apply this migration only after production health/runtime verification proves the new v4 callers are live.

revoke execute on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
from service_role;

revoke execute on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
from service_role;

revoke execute on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
from service_role;

comment on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
is 'Legacy direct application entrypoint retired. Current runtime uses admin_update_customer_store_role_v4.';

comment on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
is 'Legacy direct application entrypoint retired. Current runtime uses admin_transition_commercial_opportunity_v4.';

comment on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
is 'Legacy direct application entrypoint retired. Current runtime uses admin_transition_commercial_offer_v4.';
