import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('moderation suppression and customer-value read safety',()=>{
 test('review moderation is disabled when the moderation queue cannot be read',()=>{
   const page=read('src/app/admin/velemenyek/page.tsx');
   expect(page).toContain("error?'—':reviews.length");
   expect(page).toContain("!error&&review.status==='pending'");
 });

 test('suppression create and release actions require a readable current suppression list',()=>{
   const page=read('src/app/admin/kommunikacio/tiltolista/page.tsx');
   expect(page).toContain('!error?<SuppressionCreate');
   expect(page).toContain('!error?<SuppressionRelease');
   expect(page).toContain('Tiltás módosítása átmenetileg letiltva.');
 });

 test('customer-value KPIs never turn a failed primary read into zero customers or points',()=>{
   const page=read('src/app/admin/ugyfelertek/page.tsx');
   expect(page).toContain("error?'—':rows.length");
   expect(page).toContain("error?'—':repeat");
   expect(page).toContain("error?'—':t.count");
 });
});
