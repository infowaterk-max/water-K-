-- F6 Fresh Install: targeted Pro Office Tasks mutations. No broad legacy Office RPC replay.
-- This migration must only be applied to Fresh Install istjjkdcvsvilrycqecd.
DO $pre$
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 5
     OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018113500' AND name='shoperation_managed_0046_current_state')
     OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261018120000' AND name='shoperation_office_31_forward_v1')
     OR NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name='office31_fresh_last_member_remove_v1')
     OR (SELECT count(*) FROM public.webshop_instances WHERE slug='office31-acceptance-pro-20261018' AND subscription_plan='pro') <> 1
     OR to_regprocedure('public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb)') IS NOT NULL
     OR to_regclass('public.office_tasks') IS NULL
  THEN RAISE EXCEPTION 'OFFICE31_TASK_RPC_WRONG_FRESH_INSTALL_OR_PREEXISTING'; END IF;
END $pre$;

CREATE FUNCTION public.admin_mutate_office_task_v1(
  p_instance_id uuid, p_actor uuid, p_action text, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $task$
DECLARE
  v_org uuid;
  v_task public.office_tasks%rowtype;
  v_after public.office_tasks%rowtype;
  v_assignee uuid;
  v_thread uuid;
  v_title text;
  v_due timestamptz;
  v_id uuid;
BEGIN
  IF p_instance_id IS NULL OR p_actor IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
  THEN RAISE EXCEPTION 'OFFICE_TASK_IDENTITY_OR_PAYLOAD_REQUIRED'; END IF;

  SELECT organization_id INTO v_org FROM public.webshop_instances
    WHERE id=p_instance_id AND status IN ('pilot','active') AND subscription_plan='pro';
  IF v_org IS NULL OR NOT private.office_effective_feature_enabled_v1(p_instance_id,'officeCommunicationAdvanced')
  THEN RAISE EXCEPTION 'OFFICE_TASK_PRO_ENTITLEMENT_REQUIRED'; END IF;
  IF NOT public.can_manage_support(p_instance_id,p_actor)
  THEN RAISE EXCEPTION 'OFFICE_TASK_SUPPORT_PERMISSION_REQUIRED'; END IF;

  IF p_action='create_task' THEN
    v_title:=trim(coalesce(p_payload->>'title',''));
    IF length(v_title)<1 OR length(v_title)>240 THEN RAISE EXCEPTION 'OFFICE_TASK_TITLE_INVALID'; END IF;
    v_thread:=nullif(p_payload->>'threadId','')::uuid;
    v_due:=nullif(p_payload->>'dueAt','')::timestamptz;
    v_assignee:=coalesce(nullif(p_payload->>'assigneeUserId','')::uuid,p_actor);

    IF v_assignee<>p_actor AND NOT public.has_store_role(p_instance_id,ARRAY['owner','admin'],p_actor)
    THEN RAISE EXCEPTION 'OFFICE_TASK_ASSIGNMENT_PERMISSION_REQUIRED'; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.role_bindings b
      WHERE b.organization_id=v_org
        AND (b.instance_id=p_instance_id OR b.instance_id IS NULL)
        AND b.user_id=v_assignee AND b.revoked_at IS NULL
        AND b.valid_from<=now() AND (b.valid_until IS NULL OR b.valid_until>now())
        AND b.role_code IN ('owner','admin','order_manager','support')
    ) THEN RAISE EXCEPTION 'OFFICE_TASK_ASSIGNEE_NOT_ACTIVE_IN_STORE'; END IF;

    IF v_thread IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.office_threads t
      WHERE t.id=v_thread AND t.instance_id=p_instance_id AND t.conversation_type='customer'
    ) THEN RAISE EXCEPTION 'OFFICE_TASK_CUSTOMER_THREAD_NOT_FOUND'; END IF;

    INSERT INTO public.office_tasks(instance_id,thread_id,title,created_by,assigned_to,due_at)
    VALUES (p_instance_id,v_thread,v_title,p_actor,v_assignee,v_due)
    RETURNING * INTO v_after;

    INSERT INTO public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) VALUES (
      p_actor,'office.task_created','office_task',v_after.id::text,v_org,p_instance_id,
      left(v_title||' irodai feladat létrehozva',500),
      jsonb_build_object('taskId',v_after.id,'threadId',v_thread,'dueAt',v_due,'assigneeUserId',v_assignee,'status',v_after.status),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_task_v1')
    );
    RETURN jsonb_build_object('id',v_after.id,'taskId',v_after.id,'status',v_after.status,'assigneeUserId',v_assignee);
  END IF;

  IF p_action='complete_task' THEN
    v_id:=(p_payload->>'id')::uuid;
    SELECT * INTO v_task FROM public.office_tasks
      WHERE id=v_id AND instance_id=p_instance_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'OFFICE_TASK_NOT_FOUND'; END IF;
    IF v_task.assigned_to IS DISTINCT FROM p_actor
       AND NOT public.has_store_role(p_instance_id,ARRAY['owner','admin'],p_actor)
    THEN RAISE EXCEPTION 'OFFICE_TASK_COMPLETION_PERMISSION_REQUIRED'; END IF;
    IF v_task.status='done'
    THEN RETURN jsonb_build_object('id',v_id,'taskId',v_id,'status','done','replayed',true); END IF;
    IF v_task.status<>'open' THEN RAISE EXCEPTION 'OFFICE_TASK_NOT_OPEN'; END IF;

    UPDATE public.office_tasks SET status='done',completed_at=now()
    WHERE id=v_id AND instance_id=p_instance_id AND status='open'
    RETURNING * INTO v_after;
    IF NOT FOUND THEN RAISE EXCEPTION 'OFFICE_TASK_COMPLETION_NOT_SAVED'; END IF;

    INSERT INTO public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) VALUES (
      p_actor,'office.task_completed','office_task',v_id::text,v_org,p_instance_id,
      left(v_task.title||' irodai feladat lezárva',500),
      jsonb_build_object('status',v_task.status,'completedAt',v_task.completed_at),
      jsonb_build_object('status',v_after.status,'completedAt',v_after.completed_at),
      jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_office_task_v1')
    );
    RETURN jsonb_build_object('id',v_id,'taskId',v_id,'status','done','replayed',false);
  END IF;
  RAISE EXCEPTION 'OFFICE_TASK_ACTION_INVALID';
END;
$task$;

REVOKE ALL ON FUNCTION public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb) FROM public,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb) TO service_role;

DO $post$
BEGIN
  IF to_regprocedure('public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb)') IS NULL
     OR NOT has_function_privilege('service_role','public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb)','EXECUTE')
     OR has_function_privilege('anon','public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.admin_mutate_office_task_v1(uuid,uuid,text,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'OFFICE_TASK_RPC_PERMISSION_POSTCONDITION_FAILED'; END IF;
END $post$;
NOTIFY pgrst, 'reload schema';
