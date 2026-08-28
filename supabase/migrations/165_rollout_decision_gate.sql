-- V24: governed GO/NO-GO decision bound to the exact evidence bundle.
create or replace function public.decide_rollout(p_decision_key text,p_environment_key text,p_source_sha text,p_actor_id uuid,p_decision text,p_note text)
returns public.rollout_decisions language plpgsql security definer set search_path='' as $$
declare d public.rollout_decisions;r record;v_hash text;v_required int;begin
 if p_decision not in('go','no_go') then raise exception 'Érvénytelen rollout döntés.';end if;
 if length(trim(coalesce(p_note,'')))<10 then raise exception 'A rollout döntés indoklása kötelező.';end if;
 select * into d from public.rollout_decisions where decision_key=p_decision_key;if found then
  if d.environment_key<>p_environment_key or d.source_sha<>p_source_sha or d.actor_id<>p_actor_id or d.decision<>p_decision then raise exception 'A rollout döntési kulcs már más művelethez tartozik.';end if;return d;end if;
 select md5(coalesce(string_agg(evidence_hash,'|' order by check_kind,evidence_hash),'')),count(*) filter(where trusted and status in('fail','error')) into v_hash,v_required from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha;
 if p_decision='go' then
  if v_required>0 then raise exception 'GO nem adható blokkoló rollout evidence mellett.';end if;
  if not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='ci') then raise exception 'Trusted CI evidence hiányzik.';end if;
  if not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='smoke') then raise exception 'Trusted smoke evidence hiányzik.';end if;
  if p_environment_key in('staging','production') and not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='migration') then raise exception 'Trusted migration evidence hiányzik.';end if;
  if p_environment_key='production' and not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='security') then raise exception 'Trusted security evidence hiányzik.';end if;
 end if;
 insert into public.rollout_decisions(decision_key,environment_key,source_sha,decision,actor_id,evidence_bundle_hash,note)
 values(trim(p_decision_key),p_environment_key,trim(p_source_sha),p_decision,p_actor_id,coalesce(v_hash,md5('')),trim(p_note)) returning * into d;return d;end;$$;
revoke all on function public.decide_rollout(text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.decide_rollout(text,text,text,uuid,text,text) to service_role;
