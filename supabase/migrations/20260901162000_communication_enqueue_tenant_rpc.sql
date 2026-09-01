-- Tenant-aware communication enqueue wrapper for merchant follow-up.
create or replace function public.enqueue_communication_v2(
 p_instance_id uuid,p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_instance_id is null then raise exception 'instance_id required'; end if;
 if not public.is_platform_operator(auth.uid()) and not public.has_store_role(p_instance_id,array['owner','admin','marketing_manager','order_manager','support'],auth.uid()) then raise exception 'not authorized'; end if;
 select public.enqueue_communication(p_email,p_user_id,p_purpose,p_template_key,p_payload,p_idempotency_key,p_scheduled_at) into v_id;
 update public.communication_jobs set instance_id=p_instance_id where id=v_id and (instance_id is null or instance_id=p_instance_id);
 if not found then raise exception 'communication tenant mismatch'; end if;
 return v_id;
end$$;
revoke all on function public.enqueue_communication_v2(uuid,text,uuid,text,text,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_communication_v2(uuid,text,uuid,text,text,jsonb,text,timestamptz) to service_role;
