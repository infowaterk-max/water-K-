import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('read-only operational UX',()=>{
 test('automation and action center hide mutating controls from analytics-only users',()=>{
  const automation=read('src/app/admin/automatizalas/page.tsx');
  const actions=read('src/app/admin/intezkedesek/page.tsx');
  expect(automation).toContain("hasStorePermission(store.instanceId,'store.manage')");
  expect(automation).toContain('Csak olvasási jogosultság.');
  expect(automation).toContain('automatikus védelmi leállás');
  expect(actions).toContain("const roles=platformRole?[]:await getActiveStoreRoles(currentInstance.id);");
  expect(actions).toContain("roles.some(role=>roleHasPermission(role,'analytics.read'))");
  expect(actions).toContain("roles.some(role=>roleHasPermission(role,'store.manage'))");
  expect(actions).toContain('<AdminAccessDenied description=');
  expect(actions).toContain('A javaslatok áttekinthetők, de szimulációt');
  expect(actions).toContain("const canAct=access.mode==='enabled'&&!error");
  expect(actions).toContain("canAct?<ProposalActions");
 });
});
