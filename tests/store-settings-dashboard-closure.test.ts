import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('store settings and dashboard closure',()=>{
 test('commerce settings require store.manage for both page and server actions',()=>{
  const page=read('src/app/admin/beallitasok/fizetes-szallitas/page.tsx');
  const actions=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
  expect(page).toContain("requireCurrentStoreContext('store.manage')");
  expect(page).not.toContain('requireAdmin()');
  expect(actions.match(/requireCurrentStoreContext\('store\.manage'\)/g)?.length).toBe(2);
  expect(actions).toContain('scope.instanceId');
  expect(actions).not.toContain('getCurrentWebshopInstance');
 });

 test('merchant dashboard treats all payment-waiting states consistently',()=>{
  const page=read('src/app/admin/page.tsx');
  expect(page).toContain("['pending','pending_payment','pending_transfer'].includes(o.status)");
  expect(page).toContain("['pending','pending_payment','pending_transfer','paid','processing','shipped']");
  expect(page).toContain('roError||oiError||cjError||cvError||crError');
 });

 test('communication monitoring includes consent failures and uses user-facing wording',()=>{
  const page=read('src/app/admin/kommunikacio/page.tsx');
  expect(page).toContain('consentError');
  expect(page).toContain('Háttérfolyamat futások');
  expect(page).not.toContain('Worker futások');
 });
});
