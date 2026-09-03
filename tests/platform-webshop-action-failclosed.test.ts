import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform webshop action fail-closed behavior',()=>{
  test('platform configuration writes delegate state and audit to the atomic RPC',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(source.match(/platform_mutate_webshop_config_v3/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('platformMutationEvidence');
    expect(source).toContain("platformWriteFailed('plan/status update',error)");
    expect(source).toContain("platformWriteFailed('branding update',error)");
    expect(source).toContain("platformWriteFailed('storefront update',error)");
    expect(source).toContain("platformWriteFailed('addon update',error)");
    expect(source).toContain('Az állapotot nem tekintjük módosítottnak.');
    expect(source).not.toContain(".from('webshop_instances').update(");
    expect(source).not.toContain(".from('webshop_instance_addons').upsert(");
  });

  test('addon compatibility is enforced inside the locked platform mutation transaction',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    const sql=read('supabase/migrations/20260903170000_admin_workspace_settings_evidence_atomic_v2.sql');
    expect(source).toContain("p_action:'addon'");
    expect(source).not.toContain("addon prerequisite read");
    expect(sql).toContain("v_addon='custom-integration' and v_before.subscription_plan<>'pro'");
    expect(sql).toContain('PLATFORM_ADDON_PLAN_INCOMPATIBLE');
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
