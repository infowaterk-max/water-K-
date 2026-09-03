import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('campaign and office workspace mutation safety',()=>{
 test('campaign lifecycle actions require complete campaign evidence',()=>{
   const page=read('src/app/admin/kampanyok/[id]/page.tsx');
   expect(page).toContain('!loadError?<CampaignActions');
   expect(page).toContain('Kampányművelet átmenetileg letiltva.');
 });

 test('digital office blocks all write forms while any workspace source is partial',()=>{
   const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
   expect(page).toContain('canAct=!loadError');
   expect(page).toContain('canAct?<form action={createThreadAction}');
   expect(page).toContain('canAct?<form action={updateThreadAction}');
   expect(page).toContain('canAct&&isUnread&&<form action={markThreadReadAction}');
   expect(page).toContain('Üzenetküldés átmenetileg letiltva.');
   expect(page).toContain('canAct?<form action={createTaskAction}');
 });
});
