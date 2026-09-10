import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform webshop action fail-closed behavior',()=>{
  test('platform configuration writes delegate state and audit to atomic RPC authorities',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(source.match(/platform_mutate_webshop_config_v3/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("platform_set_webshop_addon_v1");
    expect(source).toContain('platformMutationEvidence');
    expect(source).toContain("platformWriteFailed('plan/status update',error)");
    expect(source).toContain("platformWriteFailed('branding update',error)");
    expect(source).toContain("platformWriteFailed('storefront update',error)");
    expect(source).toContain("platformWriteFailed('addon update',error)");
    expect(source).toContain('Az állapotot nem tekintjük módosítottnak.');
    expect(source).not.toContain(".from('webshop_instances').update(");
    expect(source).not.toContain(".from('webshop_instance_addons').upsert(");
  });

  test('addon compatibility is catalog-driven inside the locked platform mutation transaction',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    const sql=read('supabase/migrations/20260910124700_block11_addon_mutation_authority_v1.sql');
    expect(source).toContain("admin.rpc('platform_set_webshop_addon_v1'");
    expect(source).not.toContain("p_action:'addon'");
    expect(source).not.toContain("addon prerequisite read");
    expect(sql).toContain('public.addon_entitlement_catalog');
    expect(sql).toContain('public.addon_plan_compatibility');
    expect(sql).toContain('p_enabled and not exists');
    expect(sql).toContain('PLATFORM_ADDON_PLAN_INCOMPATIBLE');
    expect(sql).toContain("coalesce(auth.jwt()->>'role','')<>'service_role'");
    expect(sql).toContain('private.is_platform_operator_current(p_actor_id)');
  });

  test('owner invite does not create a new invitation after an ambiguous profile lookup',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    const readIndex=source.indexOf('existingError');
    const guardIndex=source.indexOf("if(existingError)redirect('/admin/platform/webaruhazak?invite=error')");
    const inviteIndex=source.indexOf('inviteUserByEmail');
    expect(readIndex).toBeGreaterThan(0);
    expect(guardIndex).toBeGreaterThan(readIndex);
    expect(inviteIndex).toBeGreaterThan(guardIndex);
  });
});
