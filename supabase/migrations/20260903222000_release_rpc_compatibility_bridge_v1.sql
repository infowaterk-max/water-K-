-- Zero-downtime release bridge for the transition from the current production application
-- to the tenant-authoritative commercial lifecycle release.
--
-- Earlier migrations in this release intentionally retire direct service-role access to these
-- legacy entrypoints. The currently deployed application still calls them, so restore only the
-- three exact signatures needed during the rolling deployment window. The new v4 entrypoints
-- are already present at this point, allowing old and new application instances to coexist.

grant execute on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
to service_role;

grant execute on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
to service_role;

grant execute on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
to service_role;

comment on function public.admin_update_customer_store_role_v2(uuid,uuid,uuid,timestamptz,jsonb)
is 'Legacy direct runtime entrypoint temporarily retained only for zero-downtime release compatibility. Final release lockdown revokes service_role execution after the new application is live.';

comment on function public.admin_transition_commercial_opportunity_v3(uuid,uuid,uuid,text)
is 'Legacy direct runtime entrypoint temporarily retained only for zero-downtime release compatibility. Final release lockdown revokes service_role execution after the new application is live.';

comment on function public.admin_transition_commercial_offer_v3(uuid,uuid,uuid,text)
is 'Legacy direct runtime entrypoint temporarily retained only for zero-downtime release compatibility. Final release lockdown revokes service_role execution after the new application is live.';
