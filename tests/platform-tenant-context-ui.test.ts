import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('platform tenant context UI',()=>{
  const actions=read('src/app/admin/platform/context-actions.ts');
  const platform=read('src/app/admin/platform/page.tsx');
  const shops=read('src/app/admin/platform/webaruhazak/page.tsx');
  const layout=read('src/app/admin/layout.tsx');

  it('validates exact eligible targets before invoking canonical tenant context',()=>{
    expect(actions).toContain('requirePlatformOperator()');
    expect(actions).toContain('UUID.test(instanceId)');
    expect(actions).toContain("from('webshop_instances')");
    expect(actions).toContain(".eq('id',instanceId)");
    expect(actions).toContain(".in('status',['pilot','active'])");
    expect(actions).toContain('setPlatformTenantContext(actor.id,instance.id)');
    expect(actions).toContain("redirect('/admin')");
  });

  it('exposes explicit tenant entry from both platform operations surfaces',()=>{
    expect(platform).toContain('selectPlatformTenantContextAction');
    expect(shops).toContain('selectPlatformTenantContextAction');
    expect(platform).toContain('Admin megnyitása');
    expect(shops).toContain('Admin megnyitása');
    expect(platform).toContain("row.status==='pilot'||row.status==='active'");
    expect(shops).toContain("instance.status==='pilot'||instance.status==='active'");
  });

  it('shows active context and provides a context-only return path',()=>{
    expect(layout).toContain('clearPlatformTenantContextAction');
    expect(layout).toContain('Aktív webshop: {merchantName}');
    expect(layout).toContain('Vissza a platform nézethez');
    expect(actions).toContain('clearPlatformTenantContext()');
    expect(actions).toContain("redirect('/admin/platform')");
  });

  it('keeps presentation actions separate from auth and pilot acceptance authorities',()=>{
    expect(actions).not.toContain('auth.signOut');
    expect(actions).not.toContain('PILOT_ACCEPTANCE');
    expect(actions).not.toContain('createPilotAcceptanceToken');
    expect(actions).toContain("from '@/lib/instances/platform-tenant-context'");
  });
});
