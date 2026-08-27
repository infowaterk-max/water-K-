-- V16 audit hardening: partial-run replay safety.
create or replace function public.process_assurance_cycle(p_run_key text)
returns public.assurance_runs language plpgsql security definer set search_path=''
as $$declare r public.assurance_runs;c public.assurance_controls;v jsonb;e public.assurance_evidence;v_checked integer:=0;v_pass integer:=0;v_fail integer:=0;v_subject text:='global';v_key text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('assurance-run:'||p_run_key,0));
 select * into r from public.assurance_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;if not found then insert into public.assurance_runs(run_key) values(p_run_key) returning * into r;end if;
 for c in select distinct on(control_key) * from public.assurance_controls where enabled order by control_key,version desc loop
  v_key:='run:'||r.id::text||':control:'||c.control_key||':v'||c.version::text;
  select * into e from public.assurance_evidence where evidence_key=v_key;
  if found then v_checked:=v_checked+1;if e.status='pass' then v_pass:=v_pass+1;else v_fail:=v_fail+1;end if;continue;end if;
  begin
   v:=public.evaluate_assurance_control(c.id);v_checked:=v_checked+1;
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values(v_key,r.id,c.id,case when (v->>'passed')::boolean then 'pass' else 'fail' end,v_subject,v,md5(v::text),(v->>'source_observed_at')::timestamptz) returning * into e;
   if e.status='pass' then v_pass:=v_pass+1;else v_fail:=v_fail+1;end if;
  exception when others then
   v_checked:=v_checked+1;v_fail:=v_fail+1;v:=jsonb_build_object('passed',false,'error',sqlerrm,'source_observed_at',now());
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values(v_key,r.id,c.id,'error',v_subject,v,md5(v::text),now()) returning * into e;
  end;
 end loop;
 update public.assurance_runs set status='completed',completed_at=now(),controls_checked=v_checked,controls_passed=v_pass,controls_failed=v_fail,metadata=metadata||jsonb_build_object('engine_version','v16-replay-safe') where id=r.id returning * into r;
 insert into public.assurance_events(event_key,run_id,event_type,metadata) values('run-complete:'||r.id::text,r.id,'run_completed',jsonb_build_object('checked',v_checked,'passed',v_pass,'failed',v_fail)) on conflict(event_key) do nothing;return r;
end;$$;
revoke all on function public.process_assurance_cycle(text) from public,anon,authenticated;grant execute on function public.process_assurance_cycle(text) to service_role;
