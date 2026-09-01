import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8').toLowerCase();

describe('admin navigation authorization',()=>{
  const s=()=>read('src/app/admin/layout.tsx');

  it('filters merchant navigation by store permission',()=>{
    const text=s();
    expect(text).toContain('getactivestoreroles');
    expect(text).toContain('rolehaspermission');
    expect(text).toContain('can(item.permission)');
  });

  it('keeps platform workbench separate from merchant admin navigation',()=>{
    const text=s();
    expect(text).toContain('const sections=isplatform?[]');
    expect(text).toContain('const operatoritems=isplatform?operator_nav:[]');
    expect(text).toContain('{!isplatform&&<link classname="adminstorelink"');
  });

  it('assigns domain permissions to sensitive merchant modules',()=>{
    const text=s();
    for(const permission of ['orders.manage','sales.manage','catalog.manage','procurement.manage','marketing.manage','support.manage','integrations.manage','analytics.read','store.manage'])
      expect(text).toContain(`permission:'${permission}'`);
  });
});
