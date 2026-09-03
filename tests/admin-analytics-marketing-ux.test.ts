import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin analytics and marketing UX',()=>{
 test('marketing pages fail visibly instead of showing false zero states',()=>{
  const marketing=read('src/app/admin/marketing/page.tsx');
  const campaigns=read('src/app/admin/kampanyok/page.tsx');
  expect(marketing).toContain('A marketingadatok egy része most nem tölthető be.');
  expect(marketing).toContain('!loadError&&!open.length');
  expect(campaigns).toContain('A kampányeredmények egy része most nem tölthető be.');
  expect(campaigns).toContain('!loadError&&campaigns.length===0');
 });

 test('campaign and inventory metrics use understandable business wording',()=>{
  const campaigns=read('src/app/admin/kampanyok/page.tsx');
  const inventory=read('src/app/admin/keszlet-elemzes/page.tsx');
  expect(campaigns).toContain('Kampányhoz köthető rendelések');
  expect(campaigns).toContain('Bevétel / költés');
  expect(inventory).toContain('Készlettőke-megtérülés');
  expect(inventory).toContain('Eladott készlet önköltsége');
  expect(inventory).toContain('készletmérési nap');
 });

 test('procurement and catalog do not hide partial data failures',()=>{
  const procurement=read('src/app/admin/beszerzes/page.tsx');
  const products=read('src/app/admin/termekek/page.tsx');
  expect(procurement).toContain('supplierError');
  expect(procurement).toContain("partially_received:'Részben beérkezett'");
  expect(products).toContain('variantError');
  expect(products).toContain('Az érintett mezőket frissítésig ne tekintsd nullának.');
 });
});
