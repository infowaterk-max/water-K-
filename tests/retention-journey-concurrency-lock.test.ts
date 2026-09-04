import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903214500_retention_journey_state_reconciliation_v3.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('retention journey concurrency lock',()=>{
  test('planner locks pending journey steps before linked communication jobs',()=>{
    const sql=read(migration);
    const stepLock=sql.indexOf("js.status='pending'\n    order by js.id\n    for update");
    const jobLock=sql.indexOf("q.status in('pending','failed','processing')");
    const processingGuard=sql.indexOf("q.status='processing'");
    const cancel=sql.indexOf("set status='cancelled',updated_at=now(),last_error='RETENTION_SEGMENT_NO_LONGER_ACTIONABLE'");
    expect(stepLock).toBeGreaterThan(-1);
    expect(jobLock).toBeGreaterThan(stepLock);
    expect(processingGuard).toBeGreaterThan(jobLock);
    expect(cancel).toBeGreaterThan(processingGuard);
  });

  test('all lock and cancellation predicates remain tenant and journey scoped',()=>{
    const sql=read(migration);
    expect(sql).toMatch(/perform js\.id[\s\S]*js\.instance_id=p_instance_id[\s\S]*js\.journey_id=j\.id[\s\S]*for update/);
    expect(sql).toMatch(/perform q\.id[\s\S]*q\.instance_id=p_instance_id[\s\S]*js\.journey_id=j\.id[\s\S]*for update/);
    expect(sql).toContain('RETENTION_JOURNEY_COMMUNICATION_IN_FLIGHT');
  });
});
