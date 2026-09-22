-- V17 final audit hardening: governance cycle failures must surface as RPC errors.
create or replace function public.process_release_governance_cycle(p_run_key text)
returns public.release_governance_runs language plpgsql security definer set search_path=''
as $$declare r public.release_governance_runs;v jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('release-governance:'||p_run_key,0));select * into r from public.release_governance_runs where run_key=p_run_key;if found and r.status='completed' then return r;end if;if not found then insert into public.release_governance_runs(run_key) values(p_run_key) returning * into r;end if;v:=public.reconcile_release_candidates(p_run_key);update public.release_governance_runs set status='completed',invalidated_candidates=coalesce((v->>'invalidated')::integer,0),completed_at=now(),metadata=jsonb_build_object('reconcile',v) where id=r.id returning * into r;return r;end;$$;
revoke all on function public.process_release_governance_cycle(text) from public,anon,authenticated;grant execute on function public.process_release_governance_cycle(text) to service_role;

revoke insert,update,delete on public.release_governance_runs from service_role;
revoke insert,update,delete on public.release_candidates from service_role;
revoke insert,update,delete on public.release_gate_results,public.release_approvals,public.release_events from service_role;
