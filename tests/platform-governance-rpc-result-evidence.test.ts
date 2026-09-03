import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform governance RPC result evidence',()=>{
 test('release evaluation fails closed when the pre-evaluation governance cycle fails or lacks evidence',()=>{
  const route=read('src/app/api/admin/releases/candidate/route.ts');
  expect(route).toContain('const preEval=await a.rpc');
  expect(route).toContain('if(preEval.error)');
  expect(route).toContain('if(!validGovernanceRun(preEval.data,runKey))');
  expect(route.indexOf('if(preEval.error)')).toBeLessThan(route.indexOf("a.rpc('evaluate_release_candidate'"));
 });
 test('release candidate actions require candidate-specific status evidence',()=>{
  const route=read('src/app/api/admin/releases/candidate/route.ts');
  expect(route).toContain('candidate.candidate_key!==key');
  expect(route).toContain("candidate.ci_status!=='success'");
  expect(route).toContain("!['ready','evaluated'].includes");
  expect(route).toContain("['ready','approved'].includes");
  expect(route).toContain("candidate.status!=='cancelled'");
  expect(route).toContain("run.status==='completed'");
 });
 test('post-release actions validate session, cycle, reconcile and rollback decision evidence',()=>{
  const route=read('src/app/api/admin/post-release/route.ts');
  expect(route).toContain('session.release_candidate_id!==candidateId');
  expect(route).toContain('result.run_key!==runKey');
  expect(route).toContain("a.from('post_release_sessions').select('id,status')");
  expect(route).toContain("session.status!==expected");
  expect(route).toContain('result.session_id!==sessionId');
  expect(route).toContain('result.decision!==decision');
 });
 test('recovery void RPCs are verified by authoritative state reads',()=>{
  const route=read('src/app/api/admin/recovery/route.ts');
  expect(route).toContain("a.rpc('start_recovery_drill'");
  expect(route).toContain("a.from('recovery_drills').select('id,status,started_at')");
  expect(route).toContain("drill.status!=='running'");
  expect(route).toContain("a.rpc('acknowledge_recovery_finding'");
  expect(route).toContain("a.from('recovery_findings').select('id,status')");
  expect(route).toContain("finding.status!=='acknowledged'");
 });
 test('recovery IDs, drill terminal status and governance run require concrete evidence',()=>{
  const route=read('src/app/api/admin/recovery/route.ts');
  expect(route).toContain("typeof data!=='string'||!uuid.test(data)");
  expect(route).toContain("!['passed','failed'].includes");
  expect(route).toContain("a.from('recovery_runs').select('id,run_key,status,completed_at')");
  expect(route).toContain("run.status!=='completed'");
 });
});
