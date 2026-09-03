import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('commerce settings write reliability',()=>{
  test('provider catalogue read failures block settings mutations',()=>{
    const source=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    expect(source.match(/providerError/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("commerceSettingsFailed('provider catalogue read',providerError)");
  });

  test('provider settings upsert must persist a concrete row',()=>{
    const source=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    expect(source).toContain("upsert(row,{onConflict:'instance_id,provider_code'}).select('provider_code').maybeSingle()");
    expect(source).toContain("commerceSettingsFailed('provider upsert',saveError)");
    expect(source).toContain('A fizetési, szállítási vagy számlázási beállítást nem tekintjük elmentettnek.');
  });

  test('provider verification requires a persisted connection row',()=>{
    const source=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    expect(source).toContain(".eq('provider_code',providerCode).select('provider_code').maybeSingle()");
    expect(source).toContain("commerceSettingsFailed('provider verification persistence',saveError)");
  });
});
