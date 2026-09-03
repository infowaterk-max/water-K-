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

  test('provider settings persist through an evidence-returning audited RPC',()=>{
    const source=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    expect(source).toContain("admin_mutate_commerce_provider_connection_v2");
    expect(source).toContain("p_action:'save'");
    expect(source).toContain("providerEvidence(saved,providerCode,'provider upsert')");
    expect(source).not.toContain(".from('webshop_instance_provider_connections').upsert(");
    expect(source).toContain('A fizetési, szállítási vagy számlázási beállítást nem tekintjük elmentettnek.');
  });

  test('provider verification requires atomic persisted evidence',()=>{
    const source=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    expect(source).toContain("p_action:'verify'");
    expect(source).toContain("providerEvidence(saved,providerCode,'provider verification persistence')");
    expect(source).not.toContain(".from('webshop_instance_provider_connections').update(");
  });
});
