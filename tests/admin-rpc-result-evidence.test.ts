import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin RPC result evidence fail-closed contracts',()=>{
 test('Control Tower mutations require id, tenant and target-status evidence',()=>{
  const alert=read('src/app/api/admin/control-tower/alert/route.ts');
  const task=read('src/app/api/admin/control-tower/task/route.ts');
  expect(alert).toContain('alert.id!==alertId');
  expect(alert).toContain('alert.instance_id!==store.instanceId');
  expect(alert).toContain('alert.status!==targetStatus');
  expect(task).toContain('task.id!==taskId');
  expect(task).toContain('task.instance_id!==store.instanceId');
  expect(task).toContain('task.status!==targetStatus');
 });
 test('Control Tower and Automation cycles require completed tenant run evidence',()=>{
  const controlRun=read('src/app/api/admin/control-tower/run/route.ts');
  const automationRun=read('src/app/api/admin/automation/run/route.ts');
  for(const source of[controlRun,automationRun]){
   expect(source).toContain('run.instance_id!==store.instanceId');
   expect(source).toContain('run.run_key!==runKey');
   expect(source).toContain('!run.completed_at');
  }
 });
 test('Automation controls and lifecycle reject mismatched or failed RPC rows',()=>{
  const control=read('src/app/api/admin/automation/control/route.ts');
  const instance=read('src/app/api/admin/automation/instance/route.ts');
  expect(control).toContain('control.instance_id!==store.instanceId');
  expect(control).toContain('control.global_paused!==body.paused');
  expect(instance).toContain('step.instance_id!==id');
  expect(instance).toContain('step.store_instance_id!==store.instanceId');
  expect(instance).toContain("step.status==='failed'");
  expect(instance).toContain("!['waiting','succeeded'].includes");
  expect(instance).toContain('instance.status!==expectedStatus');
  expect(instance).toContain('instance.instance_id!==store.instanceId');
 });
 test('Operations routes require concrete run and transition evidence',()=>{
  const run=read('src/app/api/admin/operations/run/route.ts');
  const transition=read('src/app/api/admin/operations/transition/route.ts');
  expect(run).toContain('run.run_key!==runKey');
  expect(run).toContain('!run.completed_at');
  expect(transition).toContain('operation.order_id!==orderId');
  expect(transition).toContain('operation.operational_status!==targetStatus');
 });
 test('manual communication enqueue cannot return success without a UUID job id',()=>{
  const enqueue=read('src/app/api/admin/communication/enqueue/route.ts');
  expect(enqueue).toContain("typeof data!=='string'||!uuid.test(data)");
  expect(enqueue).toContain('A kommunikáció sorba állításának eredménye nem igazolható.');
  expect(enqueue.match(/typeof data!=='string'\|\|!uuid\.test\(data\)/g)?.length).toBe(2);
 });
});
