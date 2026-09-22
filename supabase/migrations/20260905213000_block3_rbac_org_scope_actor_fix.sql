-- Organization-wide owner/admin role bindings are valid store.manage authority for every store in their organization.
do $block3_rbac_org_actor$
declare
  v_def text;
  v_old text:=$old$where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_actor_user_id
    and rb.revoked_at is null$old$;
  v_new text:=$new$where rb.organization_id=v_org and (rb.instance_id=p_instance_id or rb.instance_id is null) and rb.user_id=p_actor_user_id
    and rb.revoked_at is null$new$;
begin
  select pg_get_functiondef('public.merchant_set_store_role_v1(uuid,uuid,uuid,text)'::regprocedure) into v_def;
  if strpos(v_def,v_new)=0 then
    if strpos(v_def,v_old)=0 then raise exception 'BLOCK3_SET_ROLE_ORG_ACTOR_PATCH_TARGET_MISSING'; end if;
    execute replace(v_def,v_old,v_new);
  end if;

  select pg_get_functiondef('public.merchant_remove_store_role_v1(uuid,uuid,uuid)'::regprocedure) into v_def;
  if strpos(v_def,v_new)=0 then
    if strpos(v_def,v_old)=0 then raise exception 'BLOCK3_REMOVE_ROLE_ORG_ACTOR_PATCH_TARGET_MISSING'; end if;
    execute replace(v_def,v_old,v_new);
  end if;
end;
$block3_rbac_org_actor$;
