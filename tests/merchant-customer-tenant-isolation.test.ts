import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8').toLowerCase();

describe('merchant customer tenant isolation',()=>{
  it('scopes customer intelligence to the current store',()=>{
    const s=read('src/app/admin/ugyfelek/page.tsx');
    expect(s).toContain("requirecurrentstorecontext('sales.manage')");
    expect(s).toContain(".eq('instance_id',scope.instanceid)");
    expect(s).toContain(".in('id',customerids)");
    expect(s).not.toContain('customerrolecontrol');
  });

  it('quarantines legacy global profile role mutation',()=>{
    const s=read('src/app/api/admin/customers/[id]/route.ts');
    expect(s).toContain("getadminrequestuser('sales.manage')");
    expect(s).toContain("requirecurrentstorecontext('sales.manage')");
    expect(s).toContain(".eq('instance_id',scope.instanceid)");
    expect(s).toContain('globális profil-szerepkör');
    expect(s).toContain('status:503');
  });
});
