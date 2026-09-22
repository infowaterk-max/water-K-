import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('provider and content admin strict reads',()=>{
 test('provider catalogue exposes connection read errors to strict admin callers',()=>{
   const providers=read('src/lib/commerce/providers.ts');
   const page=read('src/app/admin/beallitasok/fizetes-szallitas/page.tsx');
   expect(providers).toContain('throwOnError?:boolean');
   expect(providers).toContain('if(result.error){if(options.throwOnError)throw result.error');
   expect(page).toContain('getCommerceProviders(type,{throwOnError:true})');
   expect(page).toContain('Fizetési, szállítási vagy számlázási kapcsolatot addig nem módosítunk.');
   expect(page).toContain('const providers=providerResult.data,loadError=providerResult.error');
 });

 test('content manager distinguishes an empty list from a failed content read',()=>{
   const server=read('src/lib/content/server.ts');
   const page=read('src/app/admin/tartalom/page.tsx');
   expect(server).toContain('getAdminContent(options:{throwOnError?:boolean}={})');
   expect(server).toContain('if(options.throwOnError)throw error');
   expect(page).toContain('getAdminContent({throwOnError:true})');
   expect(page).toContain('Hiányos állapotból tartalmat nem hozunk létre és nem módosítunk.');
 });
});
