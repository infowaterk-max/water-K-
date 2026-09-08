-- Digital Office RLS helper exposure closure.
-- Browser RLS evaluates the current signed-in user through a private helper.
-- The actor-parameterized SECURITY DEFINER helper remains service-only so a browser user
-- cannot probe another user's thread visibility through PostgREST RPC.

create or replace function private.current_user_can_read_office_thread_v1(
  p_instance_id uuid,
  p_thread_id uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.can_read_office_thread_v1(p_instance_id,p_thread_id,auth.uid());
$$;

revoke all on function private.current_user_can_read_office_thread_v1(uuid,uuid) from public,anon;
grant execute on function private.current_user_can_read_office_thread_v1(uuid,uuid) to authenticated;

revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role;

-- Participant-aware browser read policies use only the current-user private helper.
drop policy if exists office_threads_store_all on public.office_threads;
create policy office_threads_store_all on public.office_threads
  for select to authenticated
  using (private.current_user_can_read_office_thread_v1(instance_id,id));

drop policy if exists office_messages_store_all on public.office_messages;
create policy office_messages_store_all on public.office_messages
  for select to authenticated
  using (private.current_user_can_read_office_thread_v1(instance_id,thread_id));

drop policy if exists office_tasks_store_all on public.office_tasks;
create policy office_tasks_store_all on public.office_tasks
  for select to authenticated
  using (
    (thread_id is null and public.can_manage_support(instance_id,(select auth.uid())))
    or (thread_id is not null and private.current_user_can_read_office_thread_v1(instance_id,thread_id))
  );
