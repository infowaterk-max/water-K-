import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('admin route RBAC contracts',()=>{
  it('never accepts a legacy global admin role without tenant membership',()=>{
    const source=read('src/lib/auth/require-admin.ts');
    expect(source).toContain("hasStorePermission(instance.id,'store.read')");
    expect(source).toContain("webshop_instance_members");
    expect(source).not.toMatch(/if\s*\(profile\?\.role===['\"]admin['\"]\)return authData\.user/);
  });

  it('supports permission-aware API authentication',()=>{
    const source=read('src/lib/auth/admin-api.ts');
    expect(source).toContain('permission?:StorePermission');
    expect(source).toContain('hasStorePermission(instance.id,permission)');
    expect(source).toContain("hasStorePermission(instance.id,'store.read')");
    expect(source).toContain("webshop_instance_members");
  });

  it('keeps catalog mutations tenant-scoped',()=>{
    const source=read('src/app/api/admin/variants/[id]/route.ts');
    expect(source).toContain("requireCurrentStoreContext('catalog.manage')");
    expect(source).toContain(".eq('instance_id',scope.instanceId)");
  });

  it('keeps marketing and content mutations tenant-scoped',()=>{
    const campaigns=read('src/app/api/admin/campaigns/route.ts');
    const content=read('src/app/api/admin/content/route.ts');
    expect(campaigns).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(campaigns).toContain('instance_id:store.instanceId');
    expect(content).toContain("requireCurrentStoreContext('marketing.manage')");
    expect(content).toContain('instance_id:store.instanceId');
  });
});
