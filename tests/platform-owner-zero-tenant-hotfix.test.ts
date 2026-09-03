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
    expect(page).toContain('tenant nélkül is használható');
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
