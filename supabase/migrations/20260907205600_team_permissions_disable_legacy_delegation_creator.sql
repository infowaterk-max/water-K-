-- Scoped delegation v2 is the only supported creation path.
-- Keep the v1 function definition for historical migration compatibility, but remove its runtime service-role execute grant.

revoke execute on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) from service_role;
