import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('action and assurance RPC result evidence',()=>{
 test('action proposal mutations require tenant-bound proposal evidence',()=>{
  const route=read('src/app/api/admin/actions/proposal/route.ts');
  expect(route).toContain('proposal.id!==id');
  expect(route).toContain('proposal.instance_id!==store.instanceId');
  expect(route).toContain("action==='simulate'&&proposal.status!=='simulated'");
  expect(route).toContain("action==='reject'&&proposal.status!=='rejected'");
  expect(route).toContain("!['simulated','approved'].includes");
 });
 test('action execution requires succeeded execution evidence for the same tenant and proposal',()=>{
  const route=read('src/app/api/admin/actions/proposal/route.ts');
  expect(route).toContain('execution.proposal_id!==id');
  expect(route).toContain('execution.instance_id!==store.instanceId');
  expect(route).toContain("execution.status!=='succeeded'");
 });
 test('action cycle requires a completed tenant run row',()=>{
  const route=read('src/app/api/admin/actions/run/route.ts');
  expect(route).toContain('run.instance_id!==store.instanceId');
  expect(route).toContain('run.run_key!==runKey');
  expect(route).toContain('!run.completed_at');
 });
 test('assurance finding transition requires the exact finding and target status',()=>{
  const route=read('src/app/api/admin/assurance/finding/route.ts');
  expect(route).toContain('finding.id!==findingId');
  expect(route).toContain('finding.status!==action');
 });
 test('assurance readiness requires a completed run with the exact run key',()=>{
  const route=read('src/app/api/admin/assurance/run/route.ts');
  expect(route).toContain('run.run_key!==runKey');
  expect(route).toContain("run.status!=='completed'");
  expect(route).toContain('!run.completed_at');
 });
});
