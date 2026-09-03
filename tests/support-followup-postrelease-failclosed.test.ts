import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('support post-release and follow-up fail-closed closure',()=>{
 test('support inbox never exposes false zero KPIs or ticket mutations after a failed list read',()=>{
   const page=read('src/app/admin/ugyfelszolgalat/page.tsx');
   expect(page).toContain("error?'—':open.length");
   expect(page).toContain('!error?<SupportTicketActions');
   expect(page).toContain('!error&&rows.length===0');
 });

 test('support conversation blocks replies and state changes when message history cannot be loaded',()=>{
   const page=read('src/app/admin/ugyfelszolgalat/[id]/page.tsx');
   expect(page).toContain('error:messageError');
   expect(page).toContain('const canAct=!messageError');
   expect(page).toContain('Válaszadás átmenetileg letiltva.');
 });

 test('post-release stability and rollback controls require a complete evidence view',()=>{
   const page=read('src/app/admin/utoellenorzes/page.tsx');
   expect(page).toContain('canAct=!loadError');
   expect(page).toContain('canAct?<PostReleaseCycleButton');
   expect(page).toContain('canAct?<><PostReleaseActions');
 });

 test('follow-up queues distinguish transactional and marketing evidence requirements',()=>{
   const page=read('src/app/admin/utanakovetes/page.tsx');
   expect(page).toContain('canQueuePayment=!oe');
   expect(page).toContain('canQueueMarketing=!oe&&!ce&&!se');
   expect(page).toContain("oe?'—':payment.length");
   expect(page).toContain('Hozzájárulási adatok ellenőrzése szükséges');
 });
});
