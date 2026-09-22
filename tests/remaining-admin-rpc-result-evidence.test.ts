import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('remaining admin RPC result evidence',()=>{
 test('manual integration execution verifies the claimed job tenant and id',()=>{
  const route=read('src/app/api/admin/integrations/[id]/run/route.ts');
  expect(route).toContain('claim.id!==id');
  expect(route).toContain('claim.instance_id!==scope.instanceId');
  expect(route).toContain('Az integrációs feladat zárolási eredménye nem igazolható.');
 });
 test('communication suppression block requires a concrete UUID result',()=>{
  const route=read('src/app/api/admin/communication/suppression/route.ts');
  expect(route).toContain("typeof data!=='string'||!uuid.test(data)");
  expect(route).toContain('A tiltás létrehozásának eredménye nem igazolható.');
  expect(route).toContain('data!==true');
 });
 test('promotion preview requires result evidence for the requested variant',()=>{
  const route=read('src/app/api/admin/promotions/preview/route.ts');
  expect(route).toContain('preview.variantId!==parsed.data.variantId');
  expect(route).toContain("typeof preview.safe!=='boolean'");
  expect(route).toContain('A promóciós árrés számításának eredménye nem igazolható.');
 });
});
