import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('launch center permission closure',()=>{
 test('opening a webshop requires store.manage on page and action',()=>{
  const page=read('src/app/admin/indulas/page.tsx');
  const actions=read('src/app/admin/indulas/actions.ts');
  expect(page).toContain("requireCurrentStoreContext('store.manage')");
  expect(actions).toContain("requireCurrentStoreContext('store.manage')");
  expect(actions).toContain(".eq('id',scope.instanceId)");
  expect(actions).not.toContain('requireAdmin()');
 });
});
