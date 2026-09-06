import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('platform owner zero-tenant hotfix',()=>{
  it('lands platform login and activation on a tenant-independent control center',()=>{
    const form=read('src/components/auth/platform-auth-form.tsx');
    const layout=read('src/app/admin/layout.tsx');
    const page=read('src/app/admin/platform/page.tsx');

    expect(form).toContain("router.push('/admin/platform')");
    expect(form).not.toContain("router.push('/admin/iranyitokozpont')");
    expect(layout).toContain("{href:'/admin/platform',label:'Platform irányítóközpont'}");
    expect(page).toContain('requirePlatformOperator');
    expect(page).not.toContain('requireCurrentStoreContext');
    expect(page).not.toContain('requirePlanFeature');
    expect(page).toContain('webshop kiválasztása nélkül is használható');
    expect(layout).toContain('const sections=isPlatform&&!instance?[]:merchantSections');
    const adminRoot=read('src/app/admin/page.tsx');
    expect(adminRoot).toContain('getPlatformRole()');
    expect(adminRoot).toContain("if (platformRole && !instance) redirect('/admin/platform')");
  });

  it('keeps the action center usable for a platform operator without a selected tenant',()=>{
    const page=read('src/app/admin/intezkedesek/page.tsx');
    expect(page).toContain('if(platformRole&&!currentInstance)');
    expect(page).toContain('requirePlatformOperator');
    expect(page).toContain('Platformszintű, tenantfüggetlen felügyeleti nézet');
    expect(page).toContain('szándékosan csak olvasható');
    expect(page).toContain("eq('instance_id',store.instanceId)");
  });

  it('keeps platform navigation inside platform-safe routes',()=>{
    const layout=read('src/app/admin/layout.tsx');
    const monitoring=read('src/app/admin/megfigyeles/page.tsx');
    const operatorRoutes=['/admin/platform/webaruhazak','/admin/platform','/admin/intezkedesek','/admin/biztositekok','/admin/kiadasok','/admin/rollout','/admin/utoellenorzes','/admin/helyreallitas','/admin/megfigyeles','/admin/muveletek','/admin/naplo'];
    for(const route of operatorRoutes)expect(layout).toContain(`href:'${route}'`);
    expect(monitoring).toContain('href="/admin/muveletek"');
    expect(monitoring).not.toContain('href="/admin/integraciok"');
  });

  it('keeps owner activation and tenant B2B signup in the same final Auth trigger',()=>{
    const migration=read('supabase/migrations/20260903064500_platform_owner_zero_tenant_hotfix.sql');
    expect(migration).toContain('private.platform_owner_claims');
    expect(migration).toContain('public.platform_operators');
    expect(migration).toContain("values(new.id,'owner')");
    expect(migration).toContain("new.raw_user_meta_data->>'requested_instance_id'");
    expect(migration).toContain('public.customer_instance_roles');
    expect(migration).toContain('claimed_by_user_id=new.id');
  });
});
