import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('strict admin catalogue read contract',()=>{
  test('catalogue and recommendation loaders preserve fallback by default but support strict admin failure',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    const recommendations=read('src/lib/recommendations/server.ts');
    expect(catalog).toContain('throwOnError?:boolean');
    expect(catalog).toContain('if(options.throwOnError)throw error');
    expect(recommendations).toContain('throwOnError?:boolean');
  });

  test('catalogue mutation screens use strict reads and hide mutation UI on failure',()=>{
    const products=read('src/app/admin/termekek/page.tsx');
    const bulk=read('src/app/admin/termekek/tomeges/page.tsx');
    const transfer=read('src/app/admin/termekek/import-export/page.tsx');
    expect(products).toContain('includeAllChannels:true,throwOnError:true');
    expect(products).toContain('!loadError?<details');
    expect(bulk).toContain('Tömeges módosítást addig nem engedünk.');
    expect(bulk).toContain('!result.error?<BulkProductEditor');
    expect(transfer).toContain('Importot addig nem engedünk');
    expect(transfer).toContain('!result.error?<CatalogImporter');
  });

  test('procurement recommendations and dashboard do not treat a failed catalogue read as empty stock',()=>{
    expect(read('src/app/admin/beszerzes/page.tsx')).toContain('productResult.error||ve');
    expect(read('src/app/admin/termekajanlasok/page.tsx')).toContain('Hiányos állapotból ajánlási szabályt nem módosítunk.');
    const dashboard=read('src/app/admin/page.tsx');
    expect(dashboard).toContain('productLoadError=productResult.error');
    expect(dashboard).toContain("productLoadError?'—':out");
  });
});
