-- V19: reconcile latest trusted recovery state into deduplicated findings.
create or replace function public.reconcile_recovery_governance(p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.recovery_objectives;v_backup public.recovery_evidence;v_restore public.recovery_evidence;v_drill public.recovery_drills;v_type text;v_sev text;v_title text;v_desc text;v_key text;v_id uuid;v_open integer:=0;v_resolved integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('recovery:'||p_run_key,0));
 for o in select distinct on(service_key) * from public.recovery_objectives where enabled order by service_key,version desc loop
   select * into v_backup from public.recovery_evidence where objective_id=o.id and evidence_kind='backup' and trusted order by observed_at desc,captured_at desc limit 1;
   select * into v_restore from public.recovery_evidence where objective_id=o.id and evidence_kind='restore' and trusted order by observed_at desc,captured_at desc limit 1;
   select * into v_drill from public.recovery_drills where objective_id=o.id and status in('passed','failed') order by completed_at desc nulls last limit 1;

   -- backup stale/failed
   if v_backup.id is null or v_backup.observed_at < now()-make_interval(mins=>o.backup_freshness_minutes) then v_type:='backup_stale';v_sev:=case when o.criticality='critical' then 'critical' else 'high' end;v_title:='Elavult recovery backup evidence';v_desc:='Nincs a recovery objective frissességi követelményének megfelelő trusted backup evidence.';
   elsif v_backup.status<>'pass' then v_type:='backup_failed';v_sev:=case when o.criticality='critical' then 'critical' else 'high' end;v_title:='Hibás backup evidence';v_desc:='A legfrissebb trusted backup evidence nem sikeres.';
   else v_type:=null;end if;
   if v_type is not null then
     v_key:='recovery:'||o.service_key||':'||v_type;select id into v_id from public.recovery_findings where finding_key=v_key;
     if found then update public.recovery_findings set status='open',severity=v_sev,title=v_title,description=v_desc,occurrence_count=occurrence_count+1,last_detected_at=now(),updated_at=now() where id=v_id;
     else insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,v_type,v_sev,v_title,v_desc) returning id into v_id;end if;
     insert into public.recovery_events(event_key,objective_id,finding_id,event_type,metadata) values(p_run_key||':'||v_key,o.id,v_id,case when exists(select 1 from public.recovery_events where finding_id=v_id and event_type='finding_opened') then 'finding_reopened' else 'finding_opened' end,jsonb_build_object('run_key',p_run_key)) on conflict(event_key) do nothing;v_open:=v_open+1;
   else
     update public.recovery_findings set status='resolved',resolved_by=null,updated_at=now() where objective_id=o.id and finding_type in('backup_stale','backup_failed') and status<>'resolved';get diagnostics v_resolved=row_count;
   end if;

   -- restore state
   if v_restore.id is null or v_restore.status<>'pass' then
     v_key:='recovery:'||o.service_key||':restore_failed';select id into v_id from public.recovery_findings where finding_key=v_key;
     if found then update public.recovery_findings set status='open',occurrence_count=occurrence_count+1,last_detected_at=now(),updated_at=now() where id=v_id;
     else insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,'restore_failed',case when o.criticality='critical' then 'critical' else 'high' end,'Restore nincs igazolva','Nincs sikeres trusted restore evidence.') returning id into v_id;end if;v_open:=v_open+1;
   else update public.recovery_findings set status='resolved',updated_at=now() where objective_id=o.id and finding_type='restore_failed' and status<>'resolved';end if;

   -- drill recency/outcome/objectives
   if v_drill.id is null or v_drill.completed_at < now()-make_interval(days=>o.drill_interval_days) then
     v_key:='recovery:'||o.service_key||':drill_overdue';insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,'drill_overdue','high','Recovery drill esedékes','Nincs az objective intervallumán belüli lezárt recovery drill.') on conflict(finding_key) do update set status='open',occurrence_count=public.recovery_findings.occurrence_count+1,last_detected_at=now(),updated_at=now();v_open:=v_open+1;
   else
     update public.recovery_findings set status='resolved',updated_at=now() where objective_id=o.id and finding_type='drill_overdue' and status<>'resolved';
     if v_drill.status='failed' then
       v_key:='recovery:'||o.service_key||':drill_failed';insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,'drill_failed',case when o.criticality='critical' then 'critical' else 'high' end,'Recovery drill sikertelen','A legutóbbi recovery drill nem teljesítette a követelményeket.') on conflict(finding_key) do update set status='open',occurrence_count=public.recovery_findings.occurrence_count+1,last_detected_at=now(),updated_at=now();v_open:=v_open+1;
     else update public.recovery_findings set status='resolved',updated_at=now() where objective_id=o.id and finding_type='drill_failed' and status<>'resolved';end if;
     if coalesce(v_drill.measured_rto_minutes,2147483647)>o.rto_minutes then v_key:='recovery:'||o.service_key||':rto_breach';insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,'rto_breach','high','RTO cél túllépve','A legutóbbi drill mért RTO-ja meghaladja a recovery objective-et.') on conflict(finding_key) do update set status='open',occurrence_count=public.recovery_findings.occurrence_count+1,last_detected_at=now(),updated_at=now();v_open:=v_open+1;else update public.recovery_findings set status='resolved',updated_at=now() where objective_id=o.id and finding_type='rto_breach' and status<>'resolved';end if;
     if coalesce(v_drill.measured_rpo_minutes,2147483647)>o.rpo_minutes then v_key:='recovery:'||o.service_key||':rpo_breach';insert into public.recovery_findings(finding_key,objective_id,finding_type,severity,title,description) values(v_key,o.id,'rpo_breach','high','RPO cél túllépve','A legutóbbi drill mért RPO-ja meghaladja a recovery objective-et.') on conflict(finding_key) do update set status='open',occurrence_count=public.recovery_findings.occurrence_count+1,last_detected_at=now(),updated_at=now();v_open:=v_open+1;else update public.recovery_findings set status='resolved',updated_at=now() where objective_id=o.id and finding_type='rpo_breach' and status<>'resolved';end if;
   end if;
 end loop;
 return jsonb_build_object('run_key',p_run_key,'open_signals',v_open,'resolved_updates',v_resolved);
end;$$;
revoke all on function public.reconcile_recovery_governance(text) from public,anon,authenticated;grant execute on function public.reconcile_recovery_governance(text) to service_role;
