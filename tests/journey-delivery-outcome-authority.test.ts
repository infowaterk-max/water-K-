import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903220000_journey_delivery_outcome_authority_v4.sql';
const read=()=>fs.readFileSync(path.join(root,migration),'utf8');

describe('journey delivery outcome authority',()=>{
  test('journey steps gain sent as an explicit delivery state and historical queue outcomes are backfilled',()=>{
    const sql=read();
    expect(sql).toContain("check(status in('pending','queued','sent','blocked','cancelled'))");
    expect(sql).toContain("when q.status='sent' then 'sent'");
    expect(sql).toContain("when q.status in('failed','blocked') then 'blocked'");
    expect(sql).toContain("when q.status='cancelled' then 'cancelled'");
    expect(sql).toContain('js.instance_id=q.instance_id');
    expect(sql).toContain('js.communication_job_id=q.id');
  });

  test('legacy completed journeys reopen while delivery is still pending or queued',()=>{
    const sql=read();
    expect(sql).toMatch(/status='active'[\s\S]*completed_at=null[\s\S]*j\.status in\('completed','blocked'\)/);
    expect(sql).toContain("js.status in('pending','queued')");
    expect(sql).toContain("'deliveryAuthority','communication_jobs'");
  });

  test('reconciliation is tenant scoped and derives step terminal state from communication job state',()=>{
    const sql=read();
    expect(sql).toContain('public.reconcile_customer_journey_delivery_v3');
    expect(sql).toContain('js.instance_id=p_instance_id');
    expect(sql).toContain('q.instance_id=p_instance_id');
    expect(sql).toContain("if v_job_status='sent' then");
    expect(sql).toContain("elsif v_job_status in('failed','blocked') then");
    expect(sql).toContain("elsif v_job_status='cancelled' then");
    expect(sql).toContain('JOURNEY_JOB_LINK_AMBIGUOUS');
  });

  test('journey remains active while any delivery is pending and only terminal evidence resolves it',()=>{
    const sql=read();
    const reconcile=sql.split('create or replace function public.reconcile_customer_journey_delivery_v3')[1]
      .split('create or replace function public.complete_communication_job_v2')[0];
    expect(reconcile).toContain("js.status in('pending','queued')");
    expect(reconcile).toContain("status='active'");
    expect(reconcile).toContain("js.status='blocked'");
    expect(reconcile).toContain("status='blocked'");
    expect(reconcile).toContain("js.status='sent'");
    expect(reconcile).toContain("status='completed'");
    expect(reconcile).toContain("v_journey_status<>'cancelled'");
  });

  test('complete and fail RPCs lock journey steps before the communication job mutation',()=>{
    const sql=read();
    for(const fn of['complete_communication_job_v2','fail_communication_job_v2']){
      const block=sql.split(`create or replace function public.${fn}`)[1]
        .split('create or replace function public.')[0];
      const stepLock=block.indexOf('from public.customer_journey_steps js');
      const jobUpdate=block.indexOf('update public.communication_jobs q');
      const reconcile=block.indexOf('reconcile_customer_journey_delivery_v3');
      expect(stepLock).toBeGreaterThan(-1);
      expect(jobUpdate).toBeGreaterThan(stepLock);
      expect(reconcile).toBeGreaterThan(jobUpdate);
    }
  });

  test('retryable failure keeps the communication job nonterminal while terminal failure is reconciled',()=>{
    const sql=read();
    const fail=sql.split('create or replace function public.fail_communication_job_v2')[1]
      .split('create or replace function public.recover_stale_communication_jobs_v2')[0];
    expect(fail).toContain("status=case when p_retry and q.attempts<5 then 'pending' else 'failed' end");
    expect(fail).toContain('reconcile_customer_journey_delivery_v3(p_instance_id,p_id)');
  });

  test('stale claim recovery also follows step-before-job locking and reconciles terminal max-attempt failures',()=>{
    const sql=read();
    const recover=sql.split('create or replace function public.recover_stale_communication_jobs_v2')[1]
      .split('create or replace function public.dispatch_due_customer_journey_steps_v2')[0];
    const stepLock=recover.indexOf('from public.customer_journey_steps js');
    const jobUpdate=recover.indexOf('update public.communication_jobs q');
    expect(stepLock).toBeGreaterThan(-1);
    expect(jobUpdate).toBeGreaterThan(stepLock);
    expect(recover).toContain("status=case when q.attempts<5 then 'pending' else 'failed' end");
    expect(recover).toContain('reconcile_customer_journey_delivery_v3(p_instance_id,r.id)');
  });

  test('dispatch no longer treats queue admission as completion',()=>{
    const sql=read();
    const dispatch=sql.split('create or replace function public.dispatch_due_customer_journey_steps_v2')[1];
    expect(dispatch).toContain("set status='queued',communication_job_id=v_job,updated_at=now()");
    expect(dispatch).toContain("js.status in('pending','queued')");
    expect(dispatch).toContain("js.status in('pending','queued','blocked')");
    expect(dispatch).toContain("js.status='sent'");
    expect(dispatch).toContain("'seen',v_seen");
    expect(dispatch).toContain("'queued',v_queued");
    expect(dispatch).toContain("'blocked',v_blocked");
    expect(dispatch).not.toMatch(/not exists\([\s\S]{0,180}js\.status='pending'\)[\s\S]{0,180}status='completed'/);
  });

  test('runtime worker continues using the compatibility v2 completion and failure RPC names',()=>{
    const worker=fs.readFileSync(path.join(root,'src/lib/communication/worker.ts'),'utf8');
    expect(worker).toContain("rpc('complete_communication_job_v2'");
    expect(worker).toContain("rpc('fail_communication_job_v2'");
    expect(worker).toContain("rpc('recover_stale_communication_jobs_v2'");
  });
});
