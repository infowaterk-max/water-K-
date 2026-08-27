-- V18: controlled session creation and evidence ingestion.
create or replace function public.start_post_release_session(p_release_candidate_id uuid,p_actor_id uuid,p_event_key text)
returns public.post_release_sessions language plpgsql security definer set search_path='' as $$
declare c public.release_candidates;p public.post_release_policies;s public.post_release_sessions;begin
 select * into c from public.release_candidates where id=p_release_candidate_id for share;
 if not found then raise exception 'Ismeretlen kiadási jelölt.';end if;
 if c.status<>'approved' then raise exception 'Csak jóváhagyott kiadás indítható utóellenőrzésre.';end if;
 select * into p from public.post_release_policies where enabled order by version desc limit 1;
 if not found then raise exception 'Nincs aktív utóellenőrzési policy.';end if;
 select * into s from public.post_release_sessions where release_candidate_id=c.id and source_sha=c.source_sha;
 if found then return s;end if;
 insert into public.post_release_sessions(session_key,release_candidate_id,policy_id,source_sha,observation_ends_at,created_by)
 values('post:'||c.id::text||':'||left(c.source_sha,16),c.id,p.id,c.source_sha,now()+make_interval(mins=>p.observation_minutes),p_actor_id) returning * into s;
 insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'started',p_actor_id,jsonb_build_object('source_sha',c.source_sha,'policy_version',p.version));
 return s;end;$$;
revoke all on function public.start_post_release_session(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.start_post_release_session(uuid,uuid,text) to service_role;

create or replace function public.record_post_release_evidence(p_session_id uuid,p_check_kind text,p_status text,p_source text,p_observed_at timestamptz,p_evidence jsonb,p_event_key text)
returns public.post_release_evidence language plpgsql security definer set search_path='' as $$
declare s public.post_release_sessions;e public.post_release_evidence;v_trusted boolean;v_key text;begin
 select * into s from public.post_release_sessions where id=p_session_id for share;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status in('closed','cancelled') then raise exception 'Lezárt utóellenőrzéshez nem rögzíthető evidence.';end if;
 if p_check_kind not in('smoke','health','business','integration','manual') or p_status not in('pass','fail','error') then raise exception 'Érvénytelen evidence.';end if;
 v_trusted:=p_source in('github_actions','vercel','system_health');v_key:='evidence:'||s.id::text||':'||p_event_key;
 select * into e from public.post_release_evidence where evidence_key=v_key;if found then return e;end if;
 insert into public.post_release_evidence(evidence_key,session_id,check_kind,status,trusted,source,observed_at,evidence,evidence_hash)
 values(v_key,s.id,p_check_kind,p_status,v_trusted,p_source,p_observed_at,coalesce(p_evidence,'{}'::jsonb),md5(coalesce(p_evidence,'{}'::jsonb)::text||'|'||p_status||'|'||p_source||'|'||p_observed_at::text)) returning * into e;
 insert into public.post_release_events(event_key,session_id,event_type,metadata) values('event:'||v_key,s.id,'evidence_recorded',jsonb_build_object('evidence_id',e.id,'trusted',v_trusted,'status',p_status));
 return e;end;$$;
revoke all on function public.record_post_release_evidence(uuid,text,text,text,timestamptz,jsonb,text) from public,anon,authenticated;grant execute on function public.record_post_release_evidence(uuid,text,text,text,timestamptz,jsonb,text) to service_role;
