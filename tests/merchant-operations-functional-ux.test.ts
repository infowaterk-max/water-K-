import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('merchant operations functional UX',()=>{
 test('order list explicitly scopes the current webshop',()=>{
  const page=read('src/app/admin/rendelesek/page.tsx');
  expect(page).toContain("requireCurrentStoreContext('orders.manage')");
  expect(page).toContain(".eq('instance_id',scope.instanceId)");
 });

 test('integration overview counts are independent from the active table filter',()=>{
  const page=read('src/app/admin/integraciok/page.tsx');
  expect(page).toContain("select('id',{count:'exact',head:true})");
  expect(page).toContain("eq('status',key)");
  expect(page).toContain('A számlálók mindig a teljes aktuális webshopot mutatják');
 });

 test('returns and support use guarded client-side actions',()=>{
  const returns=read('src/components/admin/return-case-actions.tsx');
  const support=read('src/components/admin/support-ticket-actions.tsx');
  expect(returns).toContain('tényleges banki vagy pénzügyi visszatérítés');
  expect(returns).toContain('Hálózati hiba. A módosítást nem tekintjük végrehajtottnak.');
  expect(support).toContain('Az ügy még nincs megoldott állapotban');
  expect(support).toContain('Hálózati hiba. A módosítást nem tekintjük elmentettnek.');
 });

 test('merchant moderation and service queues translate technical states',()=>{
  const reviews=read('src/app/admin/velemenyek/page.tsx');
  const support=read('src/app/admin/ugyfelszolgalat/page.tsx');
  const returns=read('src/app/admin/visszaru/page.tsx');
  expect(reviews).toContain("pending:'Moderációra vár'");
  expect(reviews).toContain('A vélemények most nem tölthetők be.');
  expect(support).toContain("payment:'Fizetés'");
  expect(support).toContain('48+ órája nincs frissítés');
  expect(returns).toContain("damaged:'Sérült termék'");
 });
});
