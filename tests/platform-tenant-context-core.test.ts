import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('platform tenant context core authority',()=>{
  const context=read('src/lib/instances/platform-tenant-context.ts');
  const access=read('src/lib/instances/access.ts');

  it('uses an actor-bound signed short-lived context distinct from pilot acceptance',()=>{
    expect(context).toContain("PLATFORM_TENANT_CONTEXT_COOKIE='shoperation_platform_tenant_context'");
    expect(context).toContain("PLATFORM_TENANT_API_CONTEXT_COOKIE='shoperation_platform_tenant_api_context'");
    expect(context).toContain("shoperation:platform-tenant-context:v1");
    expect(context).toContain('createPlatformTenantContextToken(actorId:string,instanceId:string');
    expect(context).toContain('timingSafeEqual');
    expect(context).toContain('context?.actorId===actorId?context.instanceId:null');
    expect(context).toContain('expires<=Math.floor(now/1000)');
    expect(context).not.toContain('PILOT_ACCEPTANCE_COOKIE');
  });

  it('keeps one signed context available to admin pages and admin APIs without storefront cookie scope',()=>{
    expect(context).toContain("import 'server-only'");
    expect(context).toContain('httpOnly:true');
    expect(context).toContain("sameSite:'lax'");
    expect(context).toContain("options('/admin',PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS)");
    expect(context).toContain("options('/api/admin',PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS)");
    expect(context).not.toContain("options('/',PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS)");
    expect(context).toContain("options('/admin',0)");
    expect(context).toContain("options('/api/admin',0)");
  });

  it('revalidates current platform authority before exact selected-instance resolution',()=>{
    expect(access).toContain('getPlatformTenantContextInstanceId(auth.user.id)');
    expect(access).toContain("from('platform_operators').select('role')");
    expect(access).toContain("in('role',['owner','admin','operator'])");
    expect(access).toContain('if(selectionAuthorityError||!selectionAuthority)return null;');
    expect(access).toContain(".eq('id',selectedPlatformInstanceId).in('status',['pilot','active']).maybeSingle()");
  });

  it('fails closed for an unavailable explicit target instead of entering membership fallback',()=>{
    const selection=access.indexOf('if(selectedPlatformInstanceId){');
    const exactReturn=access.indexOf('return normalize(selectedData as unknown as InstanceRow|null);');
    const bindings=access.indexOf("from('role_bindings')");
    expect(selection).toBeGreaterThan(-1);
    expect(exactReturn).toBeGreaterThan(selection);
    expect(bindings).toBeGreaterThan(exactReturn);
    expect(access).toContain('if(selectedInstanceError)return null;');
  });

  it('preserves configured deployment and pilot acceptance precedence',()=>{
    const configured=access.indexOf('if(configuredSlug){');
    const pilot=access.indexOf('const pilotAcceptanceInstanceId=await getPilotAcceptanceInstanceId();');
    const selected=access.indexOf('getPlatformTenantContextInstanceId(auth.user.id)');
    expect(configured).toBeGreaterThan(-1);
    expect(pilot).toBeGreaterThan(configured);
    expect(selected).toBeGreaterThan(pilot);
  });
});
