import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903214500_retention_journey_state_reconciliation_v3.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('retention journey state reconciliation',()=>{
  test('migration establishes journey step mutation timestamp before using it',()=>{
    const sql=read(migration);
    const addColumn=sql.indexOf('alter table public.customer_journey_steps');
    const updatedAt=sql.indexOf('add column if not exists updated_at timestamptz not null default now()');
    const firstWrite=sql.indexOf("set status='cancelled',updated_at=now()");
    expect(addColumn).toBeGreaterThan(-1);
    expect(updatedAt).toBeGreaterThan(addColumn);
    expect(firstWrite).toBeGreaterThan(updatedAt);
  });

  test('stale retention journeys are determined only from current tenant customer metrics',()=>{
    const sql=read(migration);
    expect(sql).toContain("cj.instance_id=p_instance_id");
    expect(sql).toContain("cj.kind in('replenishment','winback')");
    expect(sql).toContain('from public.customer_commercial_metrics c');
    expect(sql).toContain('c.instance_id=p_instance_id');
    expect(sql).toContain("cj.kind='replenishment' and c.segment='at_risk'");
    expect(sql).toContain("cj.kind='winback' and c.segment in('winback','dormant')");
  });

  test('planner fails closed rather than claiming cancellation of an in-flight message',()=>{
    const sql=read(migration);
    expect(sql).toContain("q.status='processing'");
    expect(sql).toContain('RETENTION_JOURNEY_COMMUNICATION_IN_FLIGHT');
    expect(sql).not.toMatch(/status='cancelled'[\s\S]{0,120}q\.status='processing'/);
  });

  test('only unsent tenant communication jobs and their linked steps are cancelled',()=>{
    const sql=read(migration);
    expect(sql).toContain("q.instance_id=p_instance_id");
    expect(sql).toContain("q.status in('pending','failed')");
    expect(sql).toContain("js.journey_id=j.id");
    expect(sql).toContain("js.status in('pending','queued')");
    expect(sql).toContain("q.status='cancelled'");
    expect(sql).toContain("last_error='RETENTION_SEGMENT_NO_LONGER_ACTIONABLE'");
  });

  test('abandoned checkout journeys remain outside retention segment reconciliation',()=>{
    const sql=read(migration);
    const reconciliation=sql.split('-- Plan the currently actionable retention journeys exactly as before.')[0];
    expect(reconciliation).toContain("cj.kind in('replenishment','winback')");
    expect(reconciliation).not.toContain("cj.kind='abandoned_checkout'");
    expect(sql).toContain("'abandoned_checkout'::public.customer_journey_kind");
  });

  test('planner returns exact tenant cancellation evidence while keeping legacy counters',()=>{
    const sql=read(migration);
    for(const key of['instanceId','journeysSeen','stepsCreated','journeysCancelled','stepsCancelled','jobsCancelled']){
      expect(sql).toContain(`'${key}'`);
    }
    expect(sql).toContain("'auto_closed_reason','retention_segment_no_longer_actionable'");
    expect(sql).toContain("'authority','customer_commercial_metrics'");
  });

  test('cron validates exact planner evidence before dispatching journey steps',()=>{
    const route=read('src/app/api/cron/integrations/route.ts');
    expect(route).toContain('function journeyPlanEvidence');
    expect(route).toContain('row.instanceId!==instanceId');
    expect(route).toContain('nonNegativeInteger(row.journeysCancelled)');
    expect(route).toContain('nonNegativeInteger(row.stepsCancelled)');
    expect(route).toContain('nonNegativeInteger(row.jobsCancelled)');
    expect(route).toContain('RETENTION_JOURNEY_PLAN_EVIDENCE_MISSING');
    expect(route).toMatch(/journeyPlanEvidence\(planned,instance\.id\)[\s\S]*dispatch_due_customer_journey_steps_v2/);
  });
});