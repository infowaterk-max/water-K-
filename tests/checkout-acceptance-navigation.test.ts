import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('checkout acceptance navigation',()=>{
  it('uses explicit hard navigation from the seeded acceptance cart to the real checkout route',()=>{
    const source=read('src/app/admin/platform/acceptance/[instanceId]/checkout/checkout-acceptance-seeder.tsx');

    expect(source).not.toContain("from 'next/link'");
    expect(source).toContain("window.location.assign(href)");
    expect(source).toContain("onClick={()=>open('/penztar')}");
    expect(source).toContain("onClick={()=>open('/kosar')}");
    expect(source).toContain('disabled={!ready}');
    expect(source).toContain("ready?'Pénztár megnyitása':'Tesztkosár előkészítése…'");
  });
});
