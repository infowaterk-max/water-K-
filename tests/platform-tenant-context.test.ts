import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('Stage 1 explicit platform tenant context',()=>{
  const roadmap=read('quality/knowledge/living-roadmap.v2.json');
  const context=read('src/lib/instances/platform-tenant-context.ts');
  const access=read('src/lib/instances/access.ts');
  const actions=read('src/app/admin/platform/context-actions.ts');
  const platform=read('src/app/admin/platform/page.tsx');
  const shops=read('src/app/admin/platform/webaruhazak/page.tsx');
  const layout=read('src/app/admin/layout.tsx');
  const storefrontAccess=read('src/lib/storefront/access.ts');

  it('implements the canonical platform-owner tenant selection requirement as tenancy authority',()=>{
    expect(roadmap).toContain('"platform-owner tenant selection without storefront login dependency"');
    expect(context).toContain("PLATFORM_TENANT_CONTEXT_COOKIE='shoperation_platform_tenant_context'");
    expect(context).toContain("shoperation:platform-tenant-context:v1");
    expect(context).not.toContain('PILOT_ACCEPTANCE_COOKIE');
  });

  it('binds the signed context to actor, exact instance and expiry',()=>{
    expect(context).toContain('createPlatformTenantContextToken(actorId:string,instanceId:string');
    expect(context).toContain('const payload=\`${VERSION}.${actorId}.${instanceId}.${expires}\`');
    expect(context).toContain('timingSafeEqual');
    expect(context).toContain('context?.actorId===actorId?context.instanceId:null');
    expect(context).toContain('expires<=Math.floor(now/1000)');
    expect(context).toContain("path:'/'");
    expect(context).toContain('httpOnly:true');
  });

  it('requires current platform authority and resolves only the explicit selected tenant',()=>{
    expect(access).toContain('getPlatformTenantContextInstanceId(auth.user.id)');
    expect(access).toContain("from('platform_operators').select('role')");
    expect(access).toContain("in('role',['owner','admin','operator'])");
    expect(access).toContain(".eq('id',selectedPlatformInstanceId).in('status',['pilot','active']).maybeSingle()");
    expect(access).toContain('if(selectedPlatformInstanceId){');
    expect(access).toContain('if(selectionAuthorityError||!selectionAuthority)return null;');
    expect(access).toContain('if(selectedInstanceError)return null;');
    expect(access).toContain('return normalize(selectedData as unknown as InstanceRow|null);');
  });

  it('validates the target before setting context and exposes explicit selection from platform surfaces',()=>{
    expect(actions).toContain('requirePlatformOperator()');
    expect(actions).toContain(".in('status',['pilot','active'])");
    expect(actions).toContain('setPlatformTenantContext(actor.id,instance.id)');
    expect(actions).toContain("redirect('/admin')");
    expect(platform).toContain('selectPlatformTenantContextAction');
    expect(shops).toContain('selectPlatformTenantContextAction');
    expect(platform).toContain('Admin megnyitása');
    expect(shops).toContain('Admin megnyitása');
  });

  it('supports an explicit return to tenant-independent platform context',()=>{
    expect(actions).toContain('clearPlatformTenantContextAction');
    expect(actions).toContain('clearPlatformTenantContext()');
    expect(actions).toContain("redirect('/admin/platform')");
    expect(layout).toContain('clearPlatformTenantContextAction');
    expect(layout).toContain('Aktív webshop: {merchantName}');
    expect(layout).toContain('Vissza a platform nézethez');
  });

  it('does not convert pilot acceptance or merchant membership into platform selection authority',()=>{
    expect(actions).not.toContain('PILOT_ACCEPTANCE');
    expect(context).not.toContain('role_bindings');
    expect(context).not.toContain('webshop_instance_members');
    expect(storefrontAccess).toContain("instance?.status==='pilot'&&await getPilotAcceptanceInstanceId()===instance.id");
    expect(access.indexOf('getPlatformTenantContextInstanceId(auth.user.id)')).toBeLessThan(access.indexOf("from('role_bindings')"));
  });
});
