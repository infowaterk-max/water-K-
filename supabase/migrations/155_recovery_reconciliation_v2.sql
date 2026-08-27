-- V19: replay-safe recovery reconciliation using guarded finding helpers.
create or replace function public.reconcile_recovery_governance(p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.recovery_objectives;v_backup public.recovery_evidence;v_restore public.recovery_evidence;v_drill public.recovery_drills;v_open integer:=0;v_resolved integer:=0;v_id uuid;begin
 perform pg_advisory_xact_lock(hashtextextended('recovery:'||p_run_key,0));
 for o in select distinct on(service_key) * from public.recovery_objectives where enabled order by service_key,version desc loop
   select * into v_backup from public.recovery_evidence where objective_id=o.id and evidence_kind='backup' and trusted order by observed_at desc,captured_at desc limit 1;
   select * into v_restore from public.recovery_evidence where objective_id=o.id and evidence_kind='restore' and trusted order by observed_at desc,captured_at desc limit 1;
   select * into v_drill from public.recovery_drills where objective_id=o.id and status in('passed','failed') order by completed_at desc nulls last limit 1;

   if v_backup.id is null or v_backup.observed_at<now()-make_interval(mins=>o.backup_freshness_minutes) then
     v_id:=public.upsert_recovery_finding(o.id,'backup_stale',case when o.criticality='critical' then 'critical' else 'high' end,'Elavult recovery backup evidence','Nincs a recovery objective frissességi követelményének megfelelő trusted backup evidence.',p_run_key);v_open:=v_open+1;
     if public.resolve_recovery_finding(o.id,'backup_failed',p_run_key) then v_resolved:=v_resolved+1;end if;
   elsif v_backup.status<>'pass' then
     v_id:=public.upsert_recovery_finding(o.id,'backup_failed',case when o.criticality='critical' then 'critical' else 'high' end,'Hibás backup evidence','A legfrissebb trusted backup evidence nem sikeres.',p_run_key);v_open:=v_open+1;
     if public.resolve_recovery_finding(o.id,'backup_stale',p_run_key) then v_resolved:=v_resolved+1;end if;
   else
     if public.resolve_recovery_finding(o.id,'backup_stale',p_run_key) then v_resolved:=v_resolved+1;end if;
     if public.resolve_recovery_finding(o.id,'backup_failed',p_run_key) then v_resolved:=v_resolved+1;end if;
   end if;

   if v_restore.id is null or v_restore.status<>'pass' then v_id:=public.upsert_recovery_finding(o.id,'restore_failed',case when o.criticality='critical' then 'critical' else 'high' end,'Restore nincs igazolva','Nincs sikeres trusted restore evidence.',p_run_key);v_open:=v_open+1;
   else if public.resolve_recovery_finding(o.id,'restore_failed',p_run_key) then v_resolved:=v_resolved+1;end if;end if;

   if v_drill.id is null or v_drill.completed_at<now()-make_interval(days=>o.drill_interval_days) then
     v_id:=public.upsert_recovery_finding(o.id,'drill_overdue','high','Recovery drill esedékes','Nincs az objective intervallumán belüli lezárt recovery drill.',p_run_key);v_open:=v_open+1;
     if public.resolve_recovery_finding(o.id,'drill_failed',p_run_key) then v_resolved:=v_resolved+1;end if;
     if public.resolve_recovery_finding(o.id,'rto_breach',p_run_key) then v_resolved:=v_resolved+1;end if;
     if public.resolve_recovery_finding(o.id,'rpo_breach',p_run_key) then v_resolved:=v_resolved+1;end if;
   else
     if public.resolve_recovery_finding(o.id,'drill_overdue',p_run_key) then v_resolved:=v_resolved+1;end if;
     if v_drill.status='failed' then v_id:=public.upsert_recovery_finding(o.id,'drill_failed',case when o.criticality='critical' then 'critical' else 'high' end,'Recovery drill sikertelen','A legutóbbi recovery drill nem teljesítette a követelményeket.',p_run_key);v_open:=v_open+1;else if public.resolve_recovery_finding(o.id,'drill_failed',p_run_key) then v_resolved:=v_resolved+1;end if;end if;
     if coalesce(v_drill.measured_rto_minutes,2147483647)>o.rto_minutes then v_id:=public.upsert_recovery_finding(o.id,'rto_breach','high','RTO cél túllépve','A legutóbbi drill mért RTO-ja meghaladja a recovery objective-et.',p_run_key);v_open:=v_open+1;else if public.resolve_recovery_finding(o.id,'rto_breach',p_run_key) then v_resolved:=v_resolved+1;end if;end if;
     if coalesce(v_drill.measured_rpo_minutes,2147483647)>o.rpo_minutes then v_id:=public.upsert_recovery_finding(o.id,'rpo_breach','high','RPO cél túllépve','A legutóbbi drill mért RPO-ja meghaladja a recovery objective-et.',p_run_key);v_open:=v_open+1;else if public.resolve_recovery_finding(o.id,'rpo_breach',p_run_key) then v_resolved:=v_resolved+1;end if;end if;
   end if;
 end loop;
 return jsonb_build_object('run_key',p_run_key,'open_signals',v_open,'resolved_updates',v_resolved);
end;$$;
revoke all on function public.reconcile_recovery_governance(text) from public,anon,authenticated;grant execute on function public.reconcile_recovery_governance(text) to service_role;
